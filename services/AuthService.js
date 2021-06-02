var mysql = require("mysql");
var bcrypt = require("bcrypt");
var query_helper = require("../helpers/database_helper");
var jwt = require("jsonwebtoken");
var config = require("./../config/config");
var mail_helper = require("../helpers/mailer_helper");
var pushnotification = require("./../helpers/notification")

// Check User Login
const authUser = async function (req, sql) {
  if (req.method == "POST") {
    let post = req.body;
    let email = post.email.trim();
    let deviceToken = req.body.device_token ? req.body.device_token : null;
    var password = (post.password && post.password != undefined) ? post.password.trim() : "";
    return await query_helper.runQuery(sql).then(async response => {
      if (response && response.length < 1)
        return { status: false, msg: "user not found", data: {} }
      //check if user loggedin by password or token
      userFound = false;
      if ((post.fb_token && response[0].fb_token == post.fb_token) || (post.google_token && response[0].google_token == post.google_token) || (post.instragram_token && response[0].instragram_token == post.instragram_token) || (post.twitter_token && response[0].twitter_token == post.twitter_token)) {

        userFound = true;
      } else {

        if (response.length > 0 &&
          bcrypt.compareSync(password, response[0].password))
          userFound = true;
      }


      if (userFound) {
        //check if user is active or not
        if (response[0].status != 1) {
          return (res = {
            status: false,
            msg: "You are not active",
            data: {}
          });
        }
        let token = jwt.sign({ email, userid: response[0].id }, config.jwt.encryption, {
          expiresIn: config.jwt.expiration
        });
        delete response[0]["password"];
        //update Device Token
        let update_devicetokenSql = mysql.format('update users set device_token = ? where id = ?', [deviceToken, response[0].id])
        await query_helper.runQuery(update_devicetokenSql);
        return (res = {
          status: true,
          msg: "You are successfully logged in.",
          data: { user: response[0], token }
        });
      } else {
        return (res = {
          status: false,
          msg: "Invalid Login Credentials!",
          data: {}
        });
      }
    });
  } else {
    return (res = { status: false, msg: "Unable to login.", data: {} });
  }
};
module.exports.authUser = authUser;

const forgetPasswordservice = async function (email) {
  //check if email exist and set reset token
  reset_token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  let sql = `update users set reset_token = ${mysql.escape(reset_token)} where email = ${mysql.escape(email)}`;
  return await query_helper.runQuery(sql).then(async (response) => {
    //console.log(response)
    if (response.affectedRows && response.affectedRows > 0) {
      //send mail 
      let usersql = `select pref_lang from users where email = ${mysql.escape(email)} limit 1`;
      return await query_helper.runQuery(usersql).then(resp => {
        mail_helper.mailer(
          { email, reset_token, pref_lang: resp[0].pref_lang },
          { en: "Password Reset Request", es: 'Solicitud de restablecimiento de contraseña' },
          "forgotpassword"
        );
        return { status: true, msg: "Reset password url successfully send to your email address", data: {} }
      });
    } else {
      return { status: false, msg: "Email is not exist", data: {} }
    }
  })
}
module.exports.forgetPasswordservice = forgetPasswordservice;


const changepassword = async function (user_id = -1, oldpassword = "", password = "") {

  let validUser = false;
  let getUsersql = `select password from users where id =${mysql.escape(user_id)}`;

  return await query_helper.runQuery(getUsersql).then(async response => {
    if (bcrypt.compareSync(oldpassword, response[0].password)) {
      let hashedPassword = bcrypt.hashSync(password, CONFIG.bcrypt.saltRounds);

      let sql = `update users set password = '${hashedPassword}' where id = ${mysql.escape(user_id)}`;
      return await query_helper.runQuery(sql).then(resp => {
        if (resp && resp.affectedRows > 0)
          return { status: true, msg: 'Password Successfully Updated' };
        else
          return { status: false, msg: "Something went wrong" }
      })
    } else {
      return { status: false, msg: "Old password is invalid", data: {} }
    }
  })


}

module.exports.changepassword = changepassword;


function chunkArray(myArray, chunk_size) {
  var index = 0;
  var arrayLength = myArray.length;
  var tempArray = [];

  for (index = 0; index < arrayLength; index += chunk_size) {
    myChunk = myArray.slice(index, index + chunk_size);
    // Do something if you want with the group
    tempArray.push(myChunk);
  }

  return tempArray;
}

async function sendbulkMail(emails, msg) {
  let temp = chunkArray(emails, 10);

  for (let item of temp) {
    if (item.length > 0) {
      await mail_helper.asyncmailer(
        { email: item, msg },
        "Inform mail by admin",
        "informmail"
      )
    }
  }
  // //console.log('a');
  return;
}


const sendmsgtoowner = async function (msg, user_id) {
  //get all restaurant ownere and send mail to them
  let sql = `select email from users where role='owner' and status = 1`;
  return await query_helper.runQuery(sql).then(async response => {
    let emails = [];
    response.forEach(element => {
      emails.push(element.email);
    });
    // for (let index = 0; index < 200; index++) {
    //   emails.push(`testtemp${index}@mailinator.com`);
    // }

    sendbulkMail(emails, msg);

    return { status: true, msg: 'successfully send' };
  });
}


module.exports.sendmsgtoowner = sendmsgtoowner;

const sendmsgtoadmin = async function (msg, user_id) {
  //get loggedin user detail
  let usersql = `select name from users where id= ${mysql.escape(user_id)}`;


  //get admin and send msg
  let sql = `select email from users where role='admin' and status = 1`;

  return await query_helper.runMultiQuery([usersql, sql]).then(response => {

    let email = [];
    response[1].forEach(element => {
      email.push(element.email);
    });

    //send emails to Admin
    mail_helper.mailer(
      { email, msg, ownername: response[0][0].name, ownerid: user_id },
      "Inform mail to admin",
      "informmailtoadmin"
    );
    return { status: true, msg: 'successfully send' };
  });
}

module.exports.sendmsgtoadmin = sendmsgtoadmin;


const sendnotification_to_appuser = async function (msg, user_id) {
  //get loggedin user detail
  let usersql = `select name from users where id= ${mysql.escape(user_id)}`;


  //get all restaurant ownere and send mail to them
  let devicestokensql = `select platform,device_token from users where role='user' and status = 1 `;

  return await query_helper.runMultiQuery([usersql, devicestokensql]).then(response => {
    ;

    let devicetokens = [];
    response[1].forEach(element => {
      devicetokens.push(element.device_token);
    });


    if (devicetokens.length > 0) {
      chunkArray(devicetokens, 50).forEach(items => {
        pushnotification.send_push(items, 'android', 'Message Alert', msg, 'alert', 'data', '')
      })
    }

    return { status: true, msg: 'successfully send' };
  });
}

module.exports.sendnotification_to_appuser = sendnotification_to_appuser;

