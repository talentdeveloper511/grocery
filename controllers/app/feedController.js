const authService = require("../../services/AuthService");
var mysql = require("mysql");
var query_helper = require("../../helpers/database_helper");
var config = require("../../config/config");
var fieldvalidator = require("../../middleware/validator");
var mail_helper = require("../../helpers/mailer_helper");
var feedService = require("../../services/app/feedService");
var pushnotification = require("./../../helpers/notification");

const checkIn = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, res_id, comment } = req.body;
    //get pic

    let pic = (req.file) ? req.file.path.replace('public/', '') : '';

    let sql = mysql.format('INSERT INTO check_in(user_id,res_id,comment,pic) VALUES(?,?,?,?)', [user_id, res_id, comment, pic]);

    return await query_helper.runQuery(sql).then(response => {

        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "Checkin Successfully" });
        } else {
            return res.send({ status: false, msg: "Something went wrong" });
        }
    })
}

const getAppUser = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user, user_id } = req.body;

    let sql = `SELECT id,name,profileimage FROM users WHERE name LIKE ${mysql.escape("%" + user + "%")} and role="user" and status = 1 and id <>${user_id} and id not in (select requesteduser_id from friend_request where user_id = ${user_id} and status > -1) and id not in (select user_id from friend_request where requesteduser_id = ${user_id} and status > -1 ) limit 10`;

    return await query_helper.runQuery(sql).then(response => {

        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", data: response });
        } else {
            return res.send({ status: false, msg: "No user found", data: {} });
        }
    })
}

const usercheckins = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let limit = 10;
    let { user_id, page } = req.body;
    let offset = limit * (page - 1);

    let sql = `select check_in.*,users.name as user_name,res.address,res.name as res_name,pic as restaurantpic from check_in left join users on users.id = check_in.user_id left join restaurant as res on res.id = check_in.res_id where check_in.user_id = ${mysql.escape(user_id)} order by check_in.created_at desc limit ${limit} offset ${offset}`;


    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", data: response });
        } else {
            return res.send({ status: false, msg: "No Checkin Found", data: {} });
        }
    })
}

const sendFriendRequest = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    //get requested user and user id

    let { user_id, requesteduser_id } = req.body;

    // check if already send request  or already friennd if not than add in friend_request table
    let sql = mysql.format('select id,status from friend_request where user_id = ? and requesteduser_id = ? limit 1', [user_id, requesteduser_id]);

    return await query_helper.runQuery(sql).then(async response => {
        if (response && response.length < 1) {

            //check for opposite criteria when requested user is user
            let checkrequestfriendsql = mysql.format('select id,status from friend_request where user_id = ? and requesteduser_id = ? limit 1', [requesteduser_id, user_id]);

            await query_helper.runQuery(checkrequestfriendsql).then(async respons => {

                if (respons && respons.length > 0 && respons[0].status == 1) {
                    return res.send({ status: false, msg: "You are already friends", data: {} });
                }
                if (respons && respons.length > 0 && respons[0].status == 0) {
                    return res.send({ status: false, msg: "User's request already pending by you ", data: {} });
                }

                if ((respons && respons.length > 0 && respons[0].status == -1) || (respons && respons.length < 1)) {
                    //if not available then add it in
                    let addSql = mysql.format('insert into friend_request(user_id,requesteduser_id,status) values( ?,?,0) ', [user_id, requesteduser_id]);
                    let userdetailsql = `select name from users where id = ${mysql.escape(user_id)}`;
                    //get device token to send notification
                    let devicetokensql = `select device_token,platform from users where id= ${mysql.escape(requesteduser_id)}`;
                    return await query_helper.runMultiQuery([devicetokensql, addSql, userdetailsql]).then(resp => {
                        if (resp[1] && resp[1].affectedRows > 0) {
                            //send notification
                            pushnotification.send_push(resp[0][0].device_token, resp[0][0].platform, 'new friend request', `${resp[2][0].name} send you a friend request`, 'friend-request', '', '');
                            return res.send({ status: true, msg: "friend request successfully sent", data: {} });
                        } else
                            return res.send({ status: false, msg: "something went wrong", data: {} });
                    })
                }
            })

        } else if (response && response.length > 0 && response[0].status == -1) {

            //if available but rejected than update it
            let addSql = mysql.format('update friend_request set status = 0 where user_id = ? and requesteduser_id = ?', [user_id, requesteduser_id]);
            let userdetailsql = `select name from users where id = ${mysql.escape(user_id)}`;
            //get device token to send notification
            let devicetokensql = `select device_token,platform from users where id= ${mysql.escape(requesteduser_id)}`;
            return await query_helper.runMultiQuery([devicetokensql, addSql, userdetailsql]).then(resp => {
                if (resp[1] && resp[1].affectedRows > 0) {
                    //send notification
                    pushnotification.send_push(resp[0][0].device_token, resp[0][0].platform, 'new friend request', `${resp[2][0].name} send you a friend request`, 'friend-request', '', '');
                    return res.send({ status: true, msg: "friend request successfully sent", data: {} });
                } else
                    return res.send({ status: false, msg: "something went wrong", data: {} });
            })
        }
        else if (response && response.length > 0 && response[0].status == 1) {

            return res.send({ status: false, msg: "You are already friends", data: {} });
        } else if (response && response.length > 0 && response[0].status == 0) {

            return res.send({ status: false, msg: "Your friend request is pending", data: {} });
        }
        else {

            return res.send({ status: false, msg: "Something went wrong", data: {} });
        }
    })
}

const friendRequests = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    //get requested user and user id

    let limit = 10;
    let { user_id, page } = req.body;
    let offset = limit * (page - 1);

    // get all friend requests
    let sql = mysql.format('select friend_request.id,profileimage,name,friend_request.user_id as friend_id from friend_request left join users on friend_request.user_id = users.id where requesteduser_id = ? and friend_request.status = 0 order by friend_request.created_at desc limit ? offset ?', [user_id, limit, offset]);

    return await query_helper.runQuery(sql).then(async response => {

        if (response && response.length > 0) {
            return res.send({ status: true, msg: "", data: response });
        }
        else {
            return res.send({ status: false, msg: "No user found", data: {} });
        }
    })
}

const friendRequestAction = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { action, user_id, friend_request_id } = req.body;


    //user Actions 
    // 1 : accept
    // -1 : reject 


    let sql = mysql.format('update friend_request set status = ? where id = ?', [action, friend_request_id]);

    return await query_helper.runQuery(sql).then(async response => {

        if (response && response.affectedRows > 0) {
            if (action == 1) {
                //get device token and send notification

                let notificationdetail = `SELECT b.name as username,a.platform as platform , a.device_token as device_token FROM friend_request LEFT JOIN users as a on a.id = friend_request.user_id LEFT JOIN users as b on b.id = friend_request.requesteduser_id WHERE friend_request.id = ${mysql.escape(friend_request_id)}`;

                return await query_helper.runQuery(notificationdetail).then(resp => {
                    pushnotification.send_push(resp[0].device_token, resp[0].platform, 'Friend request', `${resp[0].username} accepted your friend request`, 'friend-request-accepted', '', '');
                    return res.send({ status: true, msg: "Friend request has been accepted", data: {} })
                })

            } else
                return res.send({ status: true, msg: " friend request has been rejected", data: {} })
        } else {
            return res.send({ status: false, msg: "something went wrong", data: {} });
        }
    })
}

const feed = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
   
    // Get user's feed of friends
    let limit = 10;
    let { user_id, page } = req.body;
    let offset = limit * (page - 1);

    let sql = `SELECT check_in.*,users.name as user_name,profileimage,res.name as res_name,restaurantpic,(select checkinlike from checkin_likes where user_id = ${user_id} and checkin_id = check_in.id) as checkinlike FROM check_in LEFT JOIN users ON users.id = check_in.user_id LEFT JOIN restaurant as res ON res.id = check_in.res_id WHERE check_in.user_id IN (SELECT requesteduser_id as id from friend_request WHERE status = 1 AND user_id = ${user_id} UNION SELECT user_id as id FROM friend_request WHERE status = 1 AND requesteduser_id = ${user_id}) order by check_in.created_at desc limit ${limit} offset ${offset} `



    return await query_helper.runQuery(sql).then(response => {
        
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "", data: response });
        } else {
            return res.send({ status: false, msg: "Nothing found", data: {} });
        }
    })
}

const MyFriendList = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    // Get user's feed of friends
    let limit = 10;
    let { user_id, page } = req.body;
    let offset = limit * (page - 1);

    // let sql = `SELECT friend_request.id,profileimage,name FROM friend_request LEFT JOIN users ON friend_request.requesteduser_id = users.id WHERE friend_request.status = 1 AND user_id = ${user_id} OR requesteduser_id = ${user_id} ORDER BY friend_request.created_at desc LIMIT ${limit} OFFSET ${offset}`;

    let sql = `SELECT fr1.created_at as created_at,fr1.id as id,fr1.requesteduser_id as friend_id,profileimage,name FROM friend_request as fr1 LEFT JOIN users ON fr1.requesteduser_id = users.id WHERE fr1.status = 1 AND user_id = ${user_id} UNION SELECT fr2.created_at as created_at,fr2.id as id,fr2.user_id as friend_id,profileimage,name FROM friend_request as fr2 LEFT JOIN users ON fr2.user_id = users.id WHERE fr2.status = 1 AND requesteduser_id = ${user_id} ORDER BY created_at desc LIMIT ${limit} OFFSET ${offset}`;




    return await query_helper.runQuery(sql).then(response => {

        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfully Get", data: response });
        else
            return res.send({ status: false, msg: "No Friend found", data: {} });
    })
}

const shareFeedback = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { subject, feedback, user_id } = req.body;

    let sql = mysql.format('insert into user_feedack (user_id,subject,feedback) values(?,?,?)', [user_id, subject, feedback]);

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Feedback Successfuly send", data: {} })
        else
            return res.send({ status: false, msg: "Something went wrong", data: {} });
    })

}

const checkinLike = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, checkin_id } = req.body;

    let sql = mysql.format('insert into checkin_likes(user_id,checkin_id,checkinlike) values( ? , ?,1)', [user_id, checkin_id]);

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "Successfully Liked", data: {} });
        } else {
            return res.send({ status: false, msg: "Something went wrong", data: {} });
        }
    })
}

const checkinUnlike = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, checkin_id } = req.body;

    let sql = mysql.format('DELETE FROM checkin_likes WHERE user_id = ? AND checkin_id = ?', [user_id, checkin_id]);

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "Successfully Unliked", data: {} });
        } else {
            return res.send({ status: false, msg: "Something went wrong", data: {} });
        }
    })
}

const friendDetail = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, friend_id } = req.body;

    let detailsql = mysql.format('select name,city,address,phone,profileimage,about from users where id = ?', [friend_id]);
    let lastcheckedin = mysql.format('select name,address from check_in left join restaurant on restaurant.id = check_in.res_id where check_in.user_id = ? order by check_in.created_at limit 1', [friend_id]);

    return await query_helper.runMultiQuery([detailsql, lastcheckedin]).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "Successfully get", data: { userinfo: response[0], lastcheckin_info: response[1] } });
        } else {
            return res.send({ status: false, msg: "Something went wrong", data: {} });
        }
    })
}

const sendnotification = async function (req, res) {
    pushnotification.send_push(['edX2Ud_lC00:APA91bF_YV1rnO0vRbOloa7sWmf2yQlH1g78dZLIPw9rV6u-zD3wInhaooSTqrGM3ZKeKpYLQeL47dy6KUr3Jlu9eZpKoF6ybwq80Eq8Px9LfcJSvI1hhj0lyNTusP5tSlpsds-IxJRT'], 'android', 'test', 'asd', 'asdfasdf', 'asdfasd', 'user');
}


const searchContact = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, contacts } = req.body;

    //create sql to search in contacts
    let sql = mysql.format("select id,name from users where role = 'user' and status = 1 and phone in (?) and id not in (select user_id from friend_request where requesteduser_id = ?) and id not in (select requesteduser_id from friend_request where user_id = ?) and id <> ? order by name", [contacts, user_id, user_id, user_id]);


    //get registered user for send requests
    await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: '', data: response });
        } else {
            return res.send({ status: false, msg: '', data: {} })
        }
    })
}


module.exports = {
    checkIn,
    getAppUser,
    usercheckins,
    sendFriendRequest,
    friendRequests,
    friendRequestAction,
    feed,
    MyFriendList,
    shareFeedback,
    checkinLike,
    checkinUnlike,
    friendDetail,
    sendnotification,
    searchContact
};

