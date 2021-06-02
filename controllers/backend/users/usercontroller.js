const authService = require("../../../services/AuthService");
var mysql = require("mysql");
var bcrypt = require("bcrypt");
var query_helper = require("../../../helpers/database_helper");
var helperFunctions = require("../../../helpers/functions_helper");
var jwt = require("jsonwebtoken");
var config = require("../../../config/config");
var fieldvalidator = require("../../../middleware/validator");
var { validationResult } = require("express-validator/check");
var mail_helper = require("../../../helpers/mailer_helper");
var pushnotification = require("./../../../helpers/notification");
restaurantServices = require('../../../services/restaurantService');
const { response } = require("express");
const stripe = require('stripe')(config.stripeAccountKey);

const login = async function (req, res) {
  if (!fieldvalidator.validationErrors(req, res))
    return;

  let email = req.body.email.trim();
  let password = req.body.password.trim();

  let sql = mysql.format("select * from `users` where email =? and role='owner' limit 1 ", email);
  return await authService.authUser(req, sql).then(async response => {
    if (!response.status && response.msg == "user not found") {
      //check if user has editor role
      let sql2 = `select * from editors where email = '${mysql.format(email)}' limit 1`;
      return await query_helper.runQuery(sql2).then(resp => {
        if (resp && resp.length > 0) {
          let user = resp[0]
          //check if active and correct password
          if (user.status != 1)
            return res.send({ status: false, msg: "You are not active check with owner", data: {} });

          //console.log('checkpassw', user.password, password, bcrypt.compareSync(password, user.password))
          if (bcrypt.compareSync(password, user.password)) {
            let token = jwt.sign({ email, userid: user.id }, config.jwt.encryption, {
              expiresIn: config.jwt.expiration
            });
            user['role'] = 'editor';
            return res.send({
              status: true, msg: "You are successfully logged in.", data: { user, token }
            });
          }
          else
            return res.send({ status: false, msg: "incorrect credentials", data: {} });
        } else {
          return res.send({
            status: false,
            msg: "user not found",
            data: {}
          });
        }
      })
    } else {
      res.send(response);
    }
  });
};

const editorlogin = async function (req, res) {
  if (!fieldvalidator.validationErrors(req, res))
    return;

  let email = req.body.email.trim();
  let password = req.body.password.trim();
  //console.log(email, password)
  //check if user has editor role
  let sql2 = `select * from editors where email = '${mysql.format(email)}' limit 1`;
  return await query_helper.runQuery(sql2).then(resp => {
    if (resp && resp.length > 0) {
      let user = resp[0]

      //check if active and correct password
      if (user.status != 1)
        return res.send({ status: false, msg: "You are not active check with owner", data: {} });

      //console.log('checkpassw', user.password, password, bcrypt.compareSync(password, user.password))
      // if (bcrypt.compareSync(password, user.password)) {
        let token = jwt.sign({ email, userid: user.id }, config.jwt.encryption, {
          expiresIn: config.jwt.expiration
        });
        user['role'] = 'editor';
        return res.send({
          status: true, msg: "You are successfully logged in.", data: { user, token }
        });
      // }
      // else
      //   return res.send({ status: false, msg: "incorrect credentials", data: {} });
    } else {
      return res.send({
        status: false,
        msg: "user not found",
        data: {}
      });
    }
  })
};

const processRefund= async function(req,res){
  await query_helper.runQuery(`select * from orders where id = '${req.body.id}' limit 1`).then(async resp => {
    //console.log("processRefund: ", resp)
    if (resp && resp.length > 0) {
      if(resp[0].payment_data){
        let chargeId=JSON.parse(resp[0].payment_data).id;
      
      
        // ch_1Hn6jZL1qXnMdcc8zplAYPVq
        //console.log(chargeId)
        //console.log(config.stripeAccountKey);
        //console.log(req.body.amount)
        if(req.body.amount==null){
          if (resp[0].payment_mode == 1) {
            //console.log("payment_mode 1")
            await stripe.refunds.create({
              payment_intent: chargeId,
            }).then(async resp=>{
              //console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
              //console.log(resp)
              //console.log("*-*-*-*-*--**-*-*-*-*--**-*-*-*--**--*-*-*")
              if(resp.status=='succeeded'){
                //console.log(resp)
                //console.log("*-*-*-*-*--**-*-*-*-*--**-*-*-*--**--*-*-*")
                let sql = `UPDATE orders SET status = 'Refunded' WHERE id = '${req.body.id}' limit 1`;
                await query_helper.runQuery(sql).then(response => {
                  return res.send({
                    status: true,
                    msg: "success",
                    data: {}
                  });              
                })
              }
              else{
                return res.send({
                  status: false,
                  msg: "err",
                  data: {}
                });      
              }
            }).catch(async err=>{
              //console.log(err);
              return res.send({
                status: false,
                msg: "err",
                data: {}
              });      
            });
          } else if (resp[0].payment_mode == 0) {
            await query_helper.runQuery(`select ath_acc, ath_secret from restaurant where id = '${resp[0].res_id}' limit 1`).then(data => {
              //console.log("ath_acc: ", data)
              var options = {
                'method': 'POST',
                'url': 'https://www.athmovil.com/rs/v3/refundTransaction',
                'json': {
                  "publicToken": data[0].ath_acc,
                  "privateToken": data[0].ath_secret,
                  "referenceNumber": resp[0].referenceNumber,
                  "amount": resp[0].total
                },
                'headers': {
                  'Content-Type': 'application/json'
                }
              };
              request(options, async function (error, response) {
                //console.log("error: ", error)
                if (error) throw new Error(error);
                //console.log("haulmerApi: ", response.body)
                  let sql = `UPDATE orders SET status = 'Refunded' WHERE id = '${req.body.id}' limit 1`;
                  await query_helper.runQuery(sql).then(response => {
                    return res.send({
                      status: true,
                      msg: "success",
                      data: {}
                    });              
                  })
              });            
            })
          }
        } else {
          if (resp[0].payment_mode == 1) {
            console.clear()
            console.log("por monto "+(req.body.amount * 100));
            await stripe.refunds.create({
              payment_intent: chargeId,
              amount:Math.round(req.body.amount * 100),
            }).then(async resp=>{
              //console.log("*-*-*-*-*--**-*-*-*-*--**-*-*-*--**--*-*-*")
              if(resp.status=='succeeded'){
                //console.log(resp)
                //console.log("*-*-*-*-*--**-*-*-*-*--**-*-*-*--**--*-*-*")
                let sql = `UPDATE orders SET status = 'Refunded' WHERE id = '${req.body.id}' limit 1`;
                await query_helper.runQuery(sql).then(response => {
                  return res.send({
                    status: true,
                    msg: "success",
                    data: {}
                  });              
                })
              }
              else{
              return res.send({
                status: false,
                msg: "err",
                data: {}
              });      
              }
            }).catch(async err=>{
              
              return res.send({
                status: false,
                msg: "err",
                data: {}
              });      
            });
          } else if (resp[0].payment_mode == 0) {
            await query_helper.runQuery(`select ath_acc, ath_secret from restaurant where id = '${resp[0].res_id}' limit 1`).then(data => {
              //console.log("ath_acc: ", data)
              var options = {
                'method': 'POST',
                'url': 'https://www.athmovil.com/rs/v3/refundTransaction',
                'json': {
                  "publicToken": data[0].ath_acc,
                  "privateToken": data[0].ath_secret,
                  "referenceNumber": resp[0].referenceNumber,
                  "amount": req.body.amount
                },
                'headers': {
                  'Content-Type': 'application/json'
                }
              };
              request(options, async function (error, response) {
                //console.log("error: ", error)
                if (error) throw new Error(error);
                //console.log("haulmerApi: ", response.body)
                  let sql = `UPDATE orders SET status = 'Refunded' WHERE id = '${req.body.id}' limit 1`;
                  await query_helper.runQuery(sql).then(response => {
                    return res.send({
                      status: true,
                      msg: "success",
                      data: {}
                    });              
                  })
              });            
            })
          } else {
            return res.send({
              status: true,
              msg: "success",
              data: {}
            }); 
          }
        }
      }
      else{
        return res.send({
          status: false,
          msg: "err",
          data: {}
        });      
      }
    }
    else{
      return res.send({
        status: false,
        msg: "err",
        data: {}
      });      
    }
  });
}

const registration = async function (req, res) {
  if (req.method == "POST") {
    if (!fieldvalidator.validationErrors(req, res))
      return;

    let post = req.body;
    let name = post.name.trim();
    let email = post.email.trim();
    if (post.password && post.password.length > 5)
      var password = post.password.trim();
    else
      res.send({ status: false, msg: "Password not found or incorrect", data: {} });

    let role = post.role.trim();

    let token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    bcrypt.hash(password, CONFIG.bcrypt.saltRounds, async function (err, hash) {
      let sql = `INSERT INTO users (name,email,password,role,token) VALUES (${mysql.escape(name)},${mysql.escape(email)},${mysql.escape(hash)},${mysql.escape(role)},'${token}')`;

      return await query_helper.runQuery(sql).then(response => {

        if (response.insertId && response.insertId > 0) {
          //send mail to active user
          mail_helper.mailer(
            { user_id: response.insertId, name, email, token },
            "Confirm user registration",
            "register"
          );
          res.send({ status: 200, msg: "Registration successfully", data: {} });
        } else {
          res.send({ status: false, msg: "Unable to register", data: {} });
        }
      });
    });
  } else {
    return (res = { status: false, msg: "Unable to register", data: {} });
  }
};

const changepassword = async function (req, res) {
  if (!fieldvalidator.validationErrors(req, res))
    return;

  let { newpassword, oldpassword, loggedInUser_Id } = req.body;
  return await authService.changepassword(loggedInUser_Id, oldpassword, newpassword).then(response => {
    
    res.send(response);
  })
}

const userinfo = async function (req, res) {
  if (req.method == "GET") {
    //Get user ID to detail
    let userID = req.query.userid;

    if (userID && userID > 0 && userID != undefined) {
      let sql = mysql.format("select * from `users` where id =? limit 1", userID);
      return await query_helper.runQuery(sql).then(response => {
        if (response[0]) {
          delete response[0]["password"];
          res.send({ status: 200, msg: "", data: response[0] });
        } else {
          res.send({ status: false, msg: "User not found", data: {} });
        }
      });
    } else {
      return (res = { status: false, msg: "User ID not found", data: {} });
    }
  }
}


const updateProfile = async function (req, res) {
//console.log("updating");
  if (req.method == "POST") {
    //console.log(fieldvalidator.validationErrors(req, res));
    if (!fieldvalidator.validationErrors(req, res))
      return;
    var profilepic = "";
    let post = req.body;
    let name = post.name.trim();
    let email = post.email.trim();
    let role = post.role.trim();
    let city = post.city.trim();
    let address = post.address.trim();
    let phone = post.phone.trim();
    let userid = post.id;
    //let about = post.about;
    let dob = post.dob;

    let alreadyProfileFile = "";
    if (req.file) {
      profilepic = req.file.path.replace('public/', '');

      let alllow = true;
      await query_helper.runQuery(`select id from users where email = ${mysql.escape(email)} and id != ${mysql.escape(userid)}`).then(async re => {
        if (re && re.length > 0) {
          alllow = false;
        }
      })

      if (!alllow)
        return res.send({ status: false, msg: "Email already assign to another user", data: {} });


      //get already saved file and delete it
      await query_helper.runQuery(`SELECT profileimage FROM users WHERE id = ${mysql.escape(userid)}`).then(response => {
        if (response)
          alreadyProfileFile = response[0].profileimage;
      });
      /*about=${mysql.escape(about)},*/
      //update the user
      var sql = `UPDATE users SET  name=${mysql.escape(name)},email = ${mysql.escape(email)},role=${mysql.escape(role)},profileimage = ${mysql.escape(profilepic)},city=${mysql.escape(city)},dob=${mysql.escape(dob)},address = ${mysql.escape(address)}, phone = ${mysql.escape(phone)} WHERE id = ${mysql.escape(userid)}`;
    } else {
      /*about=${mysql.escape(about)},*/
      var sql = `UPDATE users SET  name=${mysql.escape(name)},email = ${mysql.escape(email)},role=${mysql.escape(role)},city=${mysql.escape(city)},address = ${mysql.escape(address)},dob=${mysql.escape(dob)}, phone = ${mysql.escape(phone)} WHERE id = ${mysql.escape(userid)}`;
    }

    return await query_helper.runQuery(sql).then(response => {

      if (response.affectedRows && response.affectedRows > 0) {
        if (alreadyProfileFile != "")
          helperFunctions.deleteFile('public/' + alreadyProfileFile);
        res.send({
          status: 200, msg: "Profile update successfully", data: { profilepic: `${profilepic}` }
        });
      } else {
        res.send({ status: false, msg: "Unable to update", data: {} });
      }
    });


  }

}

const forgetpassword = async function (req, res) {
  if (req.method == "POST") {
    if (!fieldvalidator.validationErrors(req, res))
      return;
    let email = req.body.email;

    return await authService.forgetPasswordservice(email).then(response => {
      return res.send(response);
    });
  }
}

const dashboard = async function (req, res) {

  let user_id = req.userData.userid;
  let totalrestaurant = 0;
  let totaladvert = 0;
  let totalpromovideo = 0;
  let totalorders = 0;

  restaurantsql = `select count(id) as count from restaurant where created_by = ${mysql.escape(user_id)}`;
  await query_helper.runQuery(restaurantsql).then(response => {
    totalrestaurant = response[0].count;
  });

  advertsql = `select count(id) as count from promo_advert where user_id = ${mysql.escape(user_id)}`;
  await query_helper.runQuery(advertsql).then(response => {
    totaladvert = response[0].count;
  });

  promovideosql = `select count(id) as count from promo_video where user_id = ${mysql.escape(user_id)}`;
  await query_helper.runQuery(promovideosql).then(response => {
    totalpromovideo = response[0].count;
  });

  ordersql = `select count(id) as count from orders where res_id in (select id from restaurant where created_by = ${mysql.escape(user_id)})`;
  await query_helper.runQuery(ordersql).then(response => {
    totalorders = response[0].count;
  });

  return res.send({ resp: { restaurant: totalrestaurant, advert: totaladvert, promovideo: totalpromovideo, orders: totalorders } });

}

const activeUser = async function (req, res) {

  email = (req.body.email) ? req.body.email : "";
  token = (req.body.token) ? req.body.token : "";

  //update user status according user information
  sql = `update users set status = 1 where email = ${mysql.escape(email)} and token = ${mysql.escape(token)}`;

  return await query_helper.runQuery(sql).then(async (response) => {
    if (response.affectedRows && response.affectedRows > 0) {

      mail_helper.mailer(
        { user_id: response.insertId, email },
        "Activation successful",
        "afteractivation"
      );

      //update Token
      let updatedtoken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      let updatetokenSql = `update users set token = '${updatedtoken}' where  email = ${mysql.escape(email)}`;
      await query_helper.runQuery(updatetokenSql)

      return res.send({ status: true, msg: "You account is activated now", data: {} })
    } else {
      return res.send({ status: false, msg: "Token is invalid", data: {} })
    }
  })
}

const sendgroupmsg = async function (req, res) {
  if (!fieldvalidator.validationErrors(req, res))
    return;
  let { msg, role, loggedInUser_Id } = req.body;

  //save msg as notification in db
  let sql = mysql.format("insert into notifications(sender_id,sender_role,recipient_role,msg) values(?,'owner',?,?)", [loggedInUser_Id, role, msg])

  await query_helper.runQuery(sql).then(async resp => {
    if (role == 'admin') {
      return await authService.sendmsgtoadmin(msg, loggedInUser_Id).then(response => {
        res.send(response);
      })
    }

    if (role == 'user') {
      return await authService.sendnotification_to_appuser(msg, loggedInUser_Id).then(response => {
        res.send(response);
      })
    }
  })

}

const getnotifications = async function (req, res) {
  let { page } = req.query;

  let limit = 20;
  let offset = limit * (page - 1);

  notificationsql = `select sender_id,profileimage,name,msg,DATE_FORMAT(notifications.created_at,'%Y-%m-%d %l:%i %p') as created_at from notifications left join users on users.id = notifications.sender_id  where recipient_role = 'owner' order by notifications.created_at desc limit ${limit} offset ${offset}`;

  await query_helper.runQuery(notificationsql).then(response => {
    if (response && response.length > 0)
      return res.send({ status: true, response });
    else
      return res.send({ status: false, response: [] });
  });
}

const getOrders = async function (req, res) {

  if (req.method == "POST") {
    let post = req.body;
    //Get user ID to detail
    let userID = req.query.userid;

    let resId = req.query.res_id
    //check if token userid and query id are equal 
    if (req.userData.userid && userID && req.userData.userid != userID)
      res.send({ status: false, msg: "You are not authrize", data: {} });

    let notallow = false;
    let userRole = req.body.userrole;

    //...chcek if user role editor than that restaurnat assign to that user
    if (userRole == 'editor') {
      await query_helper.runQuery(`select res_id from editors where id = ${mysql.escape(userID)} and status = 1`).then(resp => {
        if (resp && resp[0] && resp[0].res_id == resId)
          notallow = false;
        else
          notallow = true;
      })

      if (notallow)
        return res.send({ status: false, msg: "you are not allow to access this store", data: {} });
    } else if (userRole == 'owner') {
      //check if restaurant created by user
      if (resId != -1)
        await query_helper.runQuery(`select id from restaurant where id=${resId} and created_by = ${mysql.escape(userID)}`).then(response => {
          if (response.length < 1)
            notallow = true;
        })
      else
        //check for role of loggedIn user
        await query_helper.runQuery(`select role from users where id = ${mysql.escape(userID)}`).then(async respp => {
          if (respp && respp.length > 0 && respp[0].role != 'owner')
            notallow = true;
        })
    } else if (userRole == 'admin') {
      //check if logged In user is admin
      await query_helper.runQuery(`select role from users where id = ${mysql.escape(userID)} and status = 1`).then(resp => {
        if (resp && resp[0] && resp[0].role == 'admin')
          notallow = false;
        else
          notallow = true;

        if (notallow)
          return res.send({ status: false, msg: "you are not admin", data: {} });
      })
    } else {
      return res.send({ status: false, msg: "You are not allowed here", data: {} });
    }

    if (notallow)
      return res.send({ status: false, msg: "Store not found", data: {} });


    let columns = {
      1: 'orderid',
      2: 'username',
      3: 'res_name',
      4: 'created_at',
      5: 'status',
      6: 'delieverydate',
      7: 'reslot_id'

    };

    if (userID && userID > 0) {
      if (resId == -1) {
        var sql = `SELECT DATE_FORMAT(o.created_date,'%Y-%m-%d') as created_at,o.total as order_total, delivery_mode,CONCAT(firstname, ",", lastname) as username,r.id as res_id,r.name as res_name,o.id as orderid,o.status as status , DATE_FORMAT(o.delieverydate,'%Y-%m-%d') as delieverydate , o.reslot_id as reslot_id FROM orders as o left join  restaurant as r on r.id = o.res_id left join order_address as oa on o.id = oa.order_id  WHERE 1=1 `;
        var sql1 = `SELECT DATE_FORMAT(o.created_date,'%Y-%m-%d') as created_at,o.total as order_total, delivery_mode,CONCAT(firstname, ",", lastname) as username,r.id as res_id,r.name as res_name,o.id as orderid,o.status as status, o.cart ,DATE_FORMAT(o.delieverydate,'%Y-%m-%d') as delieverydate , o.reslot_id as reslot_id FROM orders as o left join  restaurant as r on r.id = o.res_id left join order_address as oa on o.id = oa.order_id  WHERE 1=1 AND o.status!='cancelled' `;
        
        if (userRole != 'admin')
          sql += `AND res_id in (select id from restaurant where created_by = ${mysql.escape(userID)} )`
      } else {
        var sql = `SELECT DATE_FORMAT(o.created_date,'%Y-%m-%d') as created_at,o.total as order_total, delivery_mode,CONCAT(firstname, ",", lastname) as username,r.id as res_id,r.name as res_name,o.id as orderid,o.status as status , DATE_FORMAT(o.delieverydate,'%Y-%m-%d') as delieverydate , o.reslot_id as reslot_id FROM orders as o left join  restaurant as r on r.id = o.res_id left join order_address as oa on o.id = oa.order_id WHERE res_id = ${resId}`;
        var sql2 = `SELECT DATE_FORMAT(o.created_date,'%Y-%m-%d') as created_at,o.total as order_total, delivery_mode,CONCAT(firstname, ",", lastname) as username,r.id as res_id,r.name as res_name,o.id as orderid,o.status as status, o.cart ,DATE_FORMAT(o.delieverydate,'%Y-%m-%d') as delieverydate,o.reslot_id as reslot_id FROM orders as o left join  restaurant as r on r.id = o.res_id left join order_address as oa on o.id = oa.order_id  WHERE 1=1 AND o.status!='cancelled' AND res_id = ${resId} `;
      }

      if (post.search.value) {
        //console.log("search Value: ", post.search.value)
        sql +=
          ' AND u.name LIKE ' +
          mysql.escape('%' + post.search.value + '%') +
          ' OR r.name LIKE ' +
          mysql.escape('%' + post.search.value + '%') +
          ' OR o.status LIKE ' +
          mysql.escape('%' + post.search.value + '%') +
          " OR CONVERT(o.created_date,CHAR) LIKE " +
          mysql.escape('%' + post.search.value + '%') + '';
      }

      if (post.status != -1) {
        sql += ` AND o.status = ${mysql.escape(post.status)} `
      }

      if (post.startDate && post.startDate != 'Invalid date' && post.endDate && post.endDate != 'Invalid date') {
        sql += ` AND (o.created_date > ${mysql.escape(post.startDate)} AND o.created_date < ${mysql.escape(post.endDate)}) `
      }

      let query_result_org = await query_helper.runQuery(sql);
      recordTotal = query_result_org.length;
      filterRecord = query_result_org.length;

      //console.log(sql)

      sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir}, o.id DESC LIMIT ${post.start} , ${post.length}`;

      return await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response) {
          //console.log(getFilterTotalOrder(query_result_org))
          //get all type of orders nos...
          let { records, total, filterTotal } = getFilterTotalOrder(query_result_org);

          return query_helper.runQuery(sql1).then(response1 => {
            return query_helper.runQuery(sql2).then(response2 => {
              res.send({
                status: 200, msg: "", data: response, data1: response1, data2: response2, recordsTotal: recordTotal,
                recordsFiltered: filterRecord, TypesFilters: records, getOrdersTotal: total.toFixed(2), filterTotal
              });
            })
          })
        } else {
          res.send({ status: false, msg: "something went wrong", data: {} });
        }
      });
    } else {
      res.send({ status: false, msg: "User ID not found", data: {} });
    }
  }
}

getFilterTotalOrder = function (data) {
  let records = {
    received: 0,
    preparing: 0,
    ready: 0,
    pickup: 0,
    delivered: 0,
    cancelled: 0
  }
  let filterTotal = {
    received: 0,
    preparing: 0,
    ready: 0,
    pickup: 0,
    delivered: 0,
    cancelled: 0
  }
  let total = 0;

  data.forEach(e => {
    if (e.status in records) {
      records[e.status] += 1
      filterTotal[e.status] += e.order_total
    }

    if (e.status != 'paymentfailed' && e.status != 'cancelled')
      total += Number(e.order_total)
  })
  return { records, total, filterTotal }
}
getOrdersTotal = function (data) {

  data.forEach(e => {
    //console.log(e.order_total)

  })
  return total
}

const orderDetail = async function (req, res) {
  let { loggedInUser_Id, orderid, role } = req.body
  let owner_id = loggedInUser_Id;

  let notallow = false;
  //...chcek if user is admin as said
  if (role == 'admin') {
    //check if logged In user is admin
    await query_helper.runQuery(`select role from users where id = ${mysql.escape(loggedInUser_Id)} and status = 1`).then(resp => {
      if (resp && resp[0] && resp[0].role == 'admin')
        notallow = false;
      else
        notallow = true;

      if (notallow)
        return res.send({ status: false, msg: "you are not admin", data: {} });
    })
  } else if (role == 'editor') {
    //get editor owner_id 
    await query_helper.runQuery(`select owner_id from editors where id = ${mysql.escape(loggedInUser_Id)} and status = 1`).then(resp => {
      if (resp && resp.length > 0)
        owner_id = resp[0].owner_id
      else
        owner_id = -1
    })
  } else if (role == 'owner') {
    notallow = false;
  } else {
    return res.send({ status: false, msg: "You are not allowed here", data: {} });
  }

  if (notallow)
    return res.send({ status: false, msg: "order not found", data: {} });


  if (role == 'admin')
    var sql = mysql.format("select o.*,o.id as order_id,oa.*,DATE_FORMAT(o.delieverydate,' %Y-%m-%d') as delieverydate,u.name as username,u.email as useremail,u.profileimage as profilepic,u.phone as userphone,r.name as r_name,if(r.email is null or r.email='',rcu.email,r.email) as r_email,r.address as r_address,r.city as r_city,r.contact as r_contact from orders as o left join order_address as oa on oa.order_id = o.id  left join restaurant as r on r.id = o.res_id left join users as u on u.id = o.user_id left join users as rcu on r.created_by = rcu.id where o.id = ?  ", [orderid]);
  else
    var sql = mysql.format("select o.*,o.id as order_id,oa.*,DATE_FORMAT(o.delieverydate,' %Y-%m-%d') as delieverydate,u.name as username,u.email as useremail,u.profileimage as profilepic,u.phone as userphone,r.name as r_name,if(r.email is null or r.email='',rcu.email,r.email) as r_email,r.address as r_address,r.city as r_city,r.contact as r_contact from orders as o left join order_address as oa on oa.order_id = o.id  left join restaurant as r on r.id = o.res_id left join users as u on u.id = o.user_id left join users as rcu on r.created_by = rcu.id where o.id = ? and r.created_by = ?", [orderid, owner_id]);

  return await query_helper.runQuery(sql).then(response => {
    //console.log(response)
    if (response && response.length > 0) {

      return res.send({ status: true, msg: 'successfully get', data: response[0] })
    } else {
      return res.send({ status: false, msg: "Something went wrong" })
    }
  })

}

const changeorderstatus = async function (req, res) {
  if (!fieldvalidator.validationErrors(req, res))
    return;

  let { loggedInUser_Id, orderstatus, orderId } = req.body;
  let orderissue = req.body.issue ? req.body.issue : '';
  let role = req.body.role;
  //check if order can be modify by this user

  if (role == 'editor') {
    //get editor owner_id 
    await query_helper.runQuery(`select owner_id from editors where id = ${mysql.escape(loggedInUser_Id)} and status = 1`).then(resp => {
      if (resp && resp.length > 0)
        loggedInUser_Id = resp[0].owner_id
      else
        loggedInUser_Id = -1
    })
  }


  let sql = mysql.format('select o.id,r.name as resname,CONCAT(firstname, ",", lastname) as uname,pref_lang,uoa.email as uemail,device_token,platform from orders as o left join restaurant as r on r.id = o.res_id left join users as u on u.id = o.user_id left join order_address as uoa on uoa.order_id = o.id left join driver_orders as do on do.order_id = o.id where o.id = ? and (r.created_by = ? or (select role FROM users where id = ?) = "admin")', [orderId, loggedInUser_Id, loggedInUser_Id]);

  return await query_helper.runQuery(sql).then(async response => {
    if (response && response.length > 0) {
      return await restaurantServices.changeStatus(response, orderstatus, orderId, orderissue).then(resp => {
        return res.send(resp)
      })
    } else {
      return res.send({ status: false, msg: "You are not authorise to access order" })
    }
  })
}

const getReservation = async function (req, res) {
  if (req.method == "POST") {

    let post = req.body;
    //Get user ID to detail
    let userID = req.query.userid;
    //check if token userid and query id are equal 
    if (req.userData.userid && userID && req.userData.userid != userID)
      res.send({ status: false, msg: "You are not authrize", data: {} });

    let columns = {
      1: 'revid',
      2: 'username',
      3: 'res_name',
      4: 'created_at'
    };

    if (userID && userID > 0 && userID != undefined) {
      let sql = `SELECT DATE_FORMAT(rev.created_date,'%Y-%m-%d') as created_at,u.name as username,r.id as res_id,r.name as res_name,rev.id as revid FROM reservation as rev left join restaurant as r on r.id = rev.res_id left join users as u on u.id = rev.user_id  WHERE res_id in (select id from restaurant where created_by = ${mysql.escape(userID)} )`;

      if (post.search.value) {
        sql +=
          ' AND username LIKE ' +
          mysql.escape('%' + post.search.value + '%') +
          ' OR res_name LIKE ' +
          mysql.escape('%' + post.search.value + '%') +
          ' OR revid = ' + post.search.value +
          " OR CONVERT(restaurant.created_at,CHAR) LIKE " +
          mysql.escape('%' + post.search.value + '%') + '';
      }

      let query_result_org = await query_helper.runQuery(sql);
      recordTotal = query_result_org.length;
      filterRecord = query_result_org.length;

      sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir}, rev.id DESC LIMIT ${post.start} , ${post.length}`;
      //console.log(sql)
      return await query_helper.runQuery(sql).then(response => {
        if (response) {
          res.send({
            status: 200, msg: "", data: response, recordsTotal: recordTotal,
            recordsFiltered: filterRecord
          });
        } else {
          res.send({ status: false, msg: "something went wrong", data: {} });
        }
      });
    } else {
      res.send({ status: false, msg: "User ID not found", data: {} });
    }
  }
}

const getReservationDetail = async function (req, res) {
  if (!fieldvalidator.validationErrors(req, res))
    return;

  let { loggedInUser_Id, reservationId } = req.body

  //check if order detail is allow to access by loggedIn user 
  //check if user own restaurant

  let checkusersql = `SELECT role,status FROM users WHERE id = '${loggedInUser_Id}'`;

  return await query_helper.runQuery(checkusersql).then(async resp => {
    if (resp && resp.length > 0) {

      if (resp[0].role == 'admin' && resp[0].status == 1)
        var sql = mysql.format('select rev.*,r.name as res_name , u.name as user_name from reservation as rev left join restaurant as r on r.id = rev.res_id left join users as u on u.id = rev.user_id where rev.id = ?', [reservationId]);
      else
        var sql = mysql.format('select rev.*,r.name as res_name , u.name as user_name from reservation as rev left join restaurant as r on r.id = rev.res_id left join users as u on u.id = rev.user_id where rev.id = ? and r.created_by = ?', [reservationId, loggedInUser_Id]);


      return await query_helper.runQuery(sql).then(response => {

        if (response && response.length > 0) {
          return res.send({ status: true, msg: 'successfully get', data: response[0] })
        } else {
          return res.send({ status: false, msg: "Something went wrong" })
        }
      })
    } else {
      return res.send({ status: false, msg: "Something went wrong" })
    }
  })
}

const getDriverDetail = async function (req, res) {
  let orderid = req.body.order_id ? req.body.order_id : -1;

  let sql = `select do.*,u.name,u.email,u.phone,profileimage from driver_orders as do left join users as u on u.id = do.user_id where do.order_id = ${mysql.escape(orderid)}`;

  return await query_helper.runQuery(sql).then(response => {
    //console.log(response)
    if (response && response.length > 0) {
      return res.send({ status: true, data: response[0] })
    } else {
      return res.send({ status: false, data: {} })
    }
  })
}

const checkCodeOfDriver = async function (req, res) {
  if (!fieldvalidator.validationErrors(req, res))
    return;

  let { code, orderid } = req.body;

  let sql = mysql.format('select 	name,profileimage from driver_orders left join users on users.id = driver_orders.user_id  where res_verification_code = ? and order_id = ?', [code, orderid]);

  return await query_helper.runQuery(sql).then(async response => {
    if (response && response.length > 0) {
      //update code status
      await query_helper.runQuery(`update driver_orders set code_verify = 1 where res_verification_code = ${code} and order_id = ${orderid}`)
      return res.send({ status: true, msg: "Code is correct" })
    } else {
      return res.send({ status: false, msg: "Code is invalid" })
    }
  })
}

const getEditorRestaurant = async function (req, res) {
  let user_id = req.userData.userid ? req.userData.userid : -1;

  await query_helper.runQuery(`select res_id from editors where id = ${user_id} and status = 1`).then(
    response => {
      if (response && response.length > 0) {
        return res.send({ status: true, res_id: response[0].res_id })
      } else {
        return res.send({ status: false, res_id: -1 })
      }
    }
  )
}


module.exports = {
  login,
  editorlogin,
  processRefund,
  registration,
  userinfo,
  updateProfile,
  forgetpassword,
  changepassword,
  dashboard,
  activeUser,
  sendgroupmsg,
  getnotifications,
  getOrders,
  orderDetail,
  changeorderstatus,
  getReservation, getReservationDetail,
  checkCodeOfDriver,
  getDriverDetail,
  getEditorRestaurant
};
