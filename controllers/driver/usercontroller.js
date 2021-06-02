const authService = require("../../services/AuthService");
var mysql = require("mysql");
var bcrypt = require("bcrypt");
var query_helper = require("../../helpers/database_helper");
var jwt = require("jsonwebtoken");
var config = require("../../config/config");
var fieldvalidator = require("../../middleware/validator");
var { validationResult } = require("express-validator/check");
var mail_helper = require("../../helpers/mailer_helper");
var helperFunctions = require("../../helpers/functions_helper");
var pushnotification = require("./../../helpers/notification");
const { response } = require("express");


const login = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    //console.log('driver')
    let email = req.body.email.trim();
    let sql = mysql.format("select * from `users` where email =? and role='driver' limit 1 ", email);
    return await authService.authUser(req, sql).then(response => {
        res.send(response);
    });
};

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
            let sql = `INSERT INTO users (name,email,password,role,token) VALUES (${mysql.escape(name)},${mysql.escape(email)},${mysql.escape(hash)},'driver',${mysql.escape(token)})`;

            return await query_helper.runQuery(sql).then(async (response) => {

                if (response.insertId && response.insertId > 0) {
                    //create driver entry in driver sql
                    await query_helper.runQuery(`insert into drivers(user_id) values(${response.insertId})`).then(re => {
                        //console.log(re)
                    })
                    //send mail to active user
                    mail_helper.mailer(
                        { user_id: response.insertId, name, email, token },
                        "Confirm user registration",
                        "register"
                    );
                    res.send({ status: true, msg: "Registration successfully", data: {} });
                } else {
                    res.send({ status: false, msg: "Unable to register", data: {} });
                }
            });
        });
    } else {
        return (res = { status: false, msg: "Unable to register", data: {} });
    }
};

const registrationbySocial = async function (req, res) {
    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;

        let post = req.body;
        let name = post.name.trim();
        let email = post.email.trim();
        let role = post.role ? post.role.trim() : 'driver';


        let deviceToken = req.body.device_token ? req.body.device_token : null;
        let platform = req.body.platform ? req.body.platform : null;


        //get social token
        let fb_token = (post.fb_token && post.fb_token != null) ? post.fb_token.trim() : null;
        let google_token = (post.google_token && post.google_token != null) ? post.google_token.trim() : null;
        let instragram_token = (post.instragram_token && post.instragram_token != null) ? post.instragram_token.trim() : null;
        let twitter_token = (post.twitter_token && post.twitter_token != null) ? post.twitter_token.trim() : null;

        if (fb_token == null && google_token == null && instragram_token == null && twitter_token == null)
            return res.send({ status: false, msg: "No social token  found" });

        let loggedInSuccess = false;
        //check if user already registered
        let checkSql = `select * from users where email = ${mysql.escape(email)}`

        await query_helper.runQuery(checkSql).then(async resp => {
            if (resp && resp.length == 0) {
                let sql = `INSERT INTO users (name,email,role,fb_token,google_token,instragram_token,twitter_token,status,device_token,platform) VALUES (${mysql.escape(name)},${mysql.escape(email)},${mysql.escape(role)},${mysql.escape(fb_token)},${mysql.escape(google_token)},${mysql.escape(instragram_token)},${mysql.escape(twitter_token)},1,${mysql.escape(deviceToken)},${mysql.escape(platform)})`;

                await query_helper.runQuery(sql).then(async response => {
                    if (response.insertId && response.insertId > 0) {
                        loggedInSuccess = true
                    } else {
                        loggedInSuccess = false

                    }
                });
            } else {
                // loggedInSuccess = true
                let updatesql = mysql.format('UPDATE users SET fb_token = ?,google_token = ?,device_token = ? WHERE email = ? ', [fb_token, google_token, deviceToken, email])

                await query_helper.runQuery(updatesql).then(async response => {

                    if (response && response.affectedRows > 0) {
                        loggedInSuccess = true
                    } else {
                        loggedInSuccess = false

                    }
                });
            }
        })


        if (loggedInSuccess) {
            //get userdata
            let selectuserSql = `select * from users where email = '${email}' and status = 1`;

            return await query_helper.runQuery(selectuserSql).then(resp => {

                if (resp && resp.length > 0) {
                    let token = jwt.sign({ email, userid: resp[0].id }, config.jwt.encryption, {
                        expiresIn: '365d'
                    });
                    delete resp[0]["password"];
                    return res.send({
                        status: true,
                        msg: "You are successfully logged in.",
                        data: { user: resp[0], token }
                    });
                } else {
                    return res.send({ status: false, msg: "Unable to login", data: {} });
                }
            })
        } else {
            return res.send({ status: false, msg: "Unable to login", data: {} });
        }

    } else {
        return res.send({ status: false, msg: "Unable to login", data: {} });
    }
};

const forgetPassword = async function (req, res) {
    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;
        let email = req.body.email;

        return await authService.forgetPasswordservice(email).then(response => {
            return res.send(response);
        });
    }
}

const resetPassword = async function (req, res) {
    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;

        email = (req.body.email) ? req.body.email : "";
        token = (req.body.token) ? req.body.token : "";
        password = (req.body.password) ? req.body.password : "";

        //check user and update password
        reset_token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        bcrypt.hash(password, CONFIG.bcrypt.saltRounds, async function (err, hash) {
            let sql = `update users set password = ${mysql.escape(hash)}, reset_token = ${mysql.escape(reset_token)} where email = ${mysql.escape(email)} and reset_token = ${mysql.escape(token)}`;

            return await query_helper.runQuery(sql).then(async (response) => {

                if (response.affectedRows && response.affectedRows > 0) {
                    res.send({ status: true, msg: "Password change successfully successfully", data: {} });
                } else {
                    res.send({ status: false, msg: "Token is expired", data: {} });
                }
            });
        });

    }

}

const changepassword = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { newpassword, oldpassword, user_id } = req.body;
    return await authService.changepassword(user_id, oldpassword, newpassword).then(response => {

        res.send(response);
    })
}

const activeUser = async function (req, res) {
    if (req.method == "GET") {
        if (req.query.length < 2)
            return false

        email = (req.query.email) ? req.query.email : "";
        token = (req.query.token) ? req.query.token : "";

        //update user status according user information
        sql = `update users set status = 1 where role='user' and email = ${mysql.escape(email)} and token = ${mysql.escape(token)}`;
        return await query_helper.runQuery(sql).then(async (response) => {
            if (response.affectedRows && response.affectedRows > 0) {
                mail_helper.mailer(
                    { user_id: response.insertId, email },
                    "Activation successful",
                    "afteractivation"
                );

                //update token
                let updatedtoken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                let updatetokenSql = `update users set token = '${updatedtoken}' where role='user' and email = ${mysql.escape(email)}`;
                await query_helper.runQuery(updatetokenSql)
                return res.send({ status: 200, msg: "You account is activated now", data: {} })

            } else {
                return res.send({ status: false, msg: "Token is invalid exist", data: {} })
            }
        })
    }
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

    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;

        let { name, email, city, address, dob, about, phone, user_id, old_profile_img, latitude, longitude } = req.body;

        let pref_lang = req.body.pref_lang ? req.body.pref_lang : 'en';
        let profileimage = (req.file) ? req.file.path.replace('public/', '') : old_profile_img;

        let extraProfilepicQuery = (req.file) ? `,profileimage = ${mysql.escape(profileimage)}` : "";

        await query_helper.runQuery(`select id from users where email = ${mysql.escape(email)} and id != ${mysql.escape(user_id)}`).then(async re => {
            //console.log(re)
            if (re && re.length > 0) {
                return res.send({ status: false, msg: "Email already assign to another user", data: {} });
            } else {
                var sql = `UPDATE users SET  name=${mysql.escape(name)},email = ${mysql.escape(email)},city=${mysql.escape(city)},address = ${mysql.escape(address)}, dob = ${mysql.escape(dob)}, about = ${mysql.escape(about)},longitude=${mysql.escape(longitude)},latitude=${mysql.escape(latitude)}, pref_lang = ${mysql.escape(pref_lang)}, phone = ${mysql.escape(phone)}${extraProfilepicQuery} WHERE id = ${mysql.escape(user_id)}`;

                return await query_helper.runQuery(sql).then(async response => {
                    if (response.affectedRows && response.affectedRows > 0) {
                        if (req.file && old_profile_img && old_profile_img != "") {
                            helperFunctions.deleteFile(('public/' + old_profile_img));
                        }
                        let sql2 = `select *,DATE_FORMAT(dob, '%Y-%m-%d') as dob from users where id = ${mysql.escape(user_id)}`;
                        return await query_helper.runQuery(sql2).then(resp => {
                            delete resp[0]["password"];
                            return res.send({
                                status: true, msg: "Profile update successfully", data: resp[0]
                            });
                        })
                    } else {
                        res.send({ status: false, msg: "Unable to update", data: {} });
                    }
                });
            }
        })
    }
}

const logout = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let userId = req.body.user_id ? req.body.user_id : req.query.user_id;

    let sql = mysql.format('update users set device_token = null where id = ?', [userId]);
    let sql2 = `update drivers set avail_for_delivery = 0 where user_id = ${userId}`;
    //remove device token
    return await query_helper.runMultiQuery([sql, sql2]).then(response => {
        return res.send({ status: true, msg: "Logged Out Successfully" });
    })
}

const updateDriverlocation = async function (data) {
    try {
        const decode = jwt.verify(data.token, config.jwt.encryption);
        if (data.user_id && decode.userid == data.user_id) {
            //here means auth successfully and update user location
            if (data.lat && data.lng) {
                let sql = mysql.format('update drivers set current_lat = ?,current_lng=? where user_id = ?', [data.lat, data.lng, data.user_id])

                return await query_helper.runQuery(sql).then(response => {
                    if (response && response.affectedRows > 0) {
                        //  //console.log(response)
                        return {
                            status: true,
                            message: "Successfully updated"
                        };
                    } else {
                        return {
                            status: false,
                            message: "Something went wrong"
                        };
                    }
                })
            }
        } else
            return {
                status: false,
                message: "Auth failed"
            };
    } catch (error) {
        //console.log(error)
        return {
            status: false,
            message: "Auth failed"
        };
    }
}

const availForDelivery = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { status, user_id } = req.body;

    let sql = `update drivers set avail_for_delivery = ${status} where user_id = ${user_id}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Successfully updated" })
        else
            return res.send({ status: false, msg: "Something went wrong" })
    })
}

//when new order arrive request
const pickupRequest = async function (req, res) {
    let user_id = req.query.user_id ? req.query.user_id : -1;

    //check if user already have delievery

    // let sql = `select id,order_id from driver_orders where user_id = ${mysql.escape(user_id)} and order_delivered =0`;

    // await query_helper.runQuery(sql).then(async resp => {
    //     if (resp && resp.length > 0) {
    //         return res.send({ status: false, msg: "You are already assign to delivery", order_id: resp[0].order_id })
    //     } else {
    let getPickupsql = mysql.format("select payment_status,pr.order_id,r.name as r_name,r.address as r_address,r.city as r_city,r.contact as r_contact,r.latitude as r_lat,r.longitude as r_lng,restaurantpic as r_pic,oa.firstname as u_fn,oa.lastname as u_ln,oa.phone as u_phone,oa.lat as u_lat,oa.lng as u_lng,oa.formattedAddress,oa.address as u_adress,oa.city as u_city , oa.pincode as u_pin,oa.houseno as u_hn  from pickup_request as pr left join orders as o on o.id = pr.order_id left join restaurant as r on r.id = o.res_id left join order_address as oa on oa.order_id = o.id where pr.user_id = ? and (select avail_for_delivery from drivers where user_id = ?) = 1", [user_id, user_id])

    await query_helper.runQuery(getPickupsql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: 'successfully get', data: response })
        } else {
            return res.send({ status: false, msg: 'No request found' })
        }
    })
    //     }
    // })
}

const acceptDelievery = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, order_id } = req.body

    //check if delivery already not accepted for this order
    let sql = `select id from driver_orders where order_id = ${mysql.escape(order_id)}`;

    await query_helper.runQuery(sql).then(async response => {
        if (response) {
            if (response.length > 0) {
                return res.send({ status: false, msg: "Somebody already apply for delivery for this order" })
            } else {
                // //check if user already at deliever
                // let alreadysql = `select id from driver_orders where user_id = ${mysql.escape(user_id)} and order_delivered =0`;

                // await query_helper.runQuery(alreadysql).then(async r => {
                //     if (r) {
                //         if (r.length > 0) {
                //             return res.send({ status: false, msg: "You already assign to another delivery" })
                //         } else {
                let randomNo = Math.floor(100000 + Math.random() * 900000);
                //console.log(`insert into driver_orders (user_id,order_id,res_id,res_verification_code,earn_payment) values(${mysql.escape(user_id)},${mysql.escape(order_id)},(select res_id from orders where id = ${mysql.escape(order_id)}),${randomNo},(select driver_fee from setting where id =1))`);
                return await query_helper.runQuery(`insert into driver_orders (user_id,order_id,res_id,res_verification_code,earn_payment) values(${mysql.escape(user_id)},${mysql.escape(order_id)},(select res_id from orders where id = ${mysql.escape(order_id)}),${randomNo},(select driver_fee from setting where id =1))`).then(async resp => {
                    //console.log(resp)
                    await query_helper.runQuery(`delete from pickup_request where order_id = ${mysql.escape(order_id)}`)
                    if (resp && resp.insertId > 0)
                        return res.send({ status: true, msg: "You are successfully assign to order ", code: randomNo })
                    else
                        return res.send({ status: false, msg: "Something went wrong" })
                })
                //     }
                // } else {
                //     return res.send({ status: false, msg: "Something went wrong" })
                // }
                // })


            }
        } else {
            return res.send({ status: false, msg: "Something went wrong" })
        }
    })

}


const getOrderDetail = async function (req, res) {
    let order_id = req.body.order_id ? req.body.order_id : -1;
    let user_id = req.body.user_id ? req.body.user_id : -1;

    //get order detail , user detail , and restaurant detail 
    let sql = mysql.format("select payment_status,o.id as order_id,o.res_id,cart,food_tax,drink_tax,subtotal,tax,total,payment_mode,DATE_FORMAT(o.created_date,'%Y-%m-%d') as order_date,o.status as order_status, r.name,restaurantpic,r.address as r_address,r.city as res_city,r.contact as res_contact,res_verification_code,r.latitude as res_lat,r.longitude as res_lng,oa.firstname as u_firstname,oa.lastname as u_lastname,oa.phone as u_phone,u.address as u_address,oa.city as u_city,oa.pincode as u_pincode,oa.houseno as u_houseno,oa.lat as u_lat,oa.lng as u_lng,oa.formattedAddress,  do.order_delivered from orders as o left join users as u on u.id = o.id left join restaurant as r on r.id = o.res_id left join order_address as oa on oa.order_id = o.id left join driver_orders as do on do.order_id = o.id where o.id = ? and do.user_id = ?", [order_id, user_id])

    //console.log(sql)
    await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "Successfully get", data: response })
        } else {
            return res.send({ status: false, msg: "you are not authorize" })
        }
    })

}


const verifyUserCode = async function (req, res) {
    let code = req.body.code ? req.body.code : -1;
    let orderid = req.body.orderid ? req.body.orderid : -1

    //console.log(code, orderid)

    let sql = `update orders set code_verified = 1 where id = ${orderid} and order_code = ${code}`

    await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: " code verified" })
        } else {
            return res.send({ status: false, msg: "incorrect code" })
        }
    })

}

const updatePaymentStatus = async function (req, res) {
    let orderid = req.body.orderid ? req.body.orderid : -1;
    let user_id = req.body.user_id

    let allow = false;

    await query_helper.runQuery(` select id from driver_orders where order_id = ${orderid} and user_id= ${user_id}`).then(response => {
        //console.log(response)
        if (response && response.length > 0)
            allow = true;
    })

    if (!allow)
        return res.send({ status: false, msg: "Something went wrong" })

    let sql = `update orders set payment_status = 1 where id = ${orderid} `
    //console.log(sql);
    await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "Payment status change" })
        } else {
            return res.send({ status: false, msg: "Something went wrong" })
        }
    })
}

const changeorderstatus = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, orderstatus, order_id } = req.body;

    let orderissue = req.body.issue ? req.body.issue : '';
    //check if order can be modify by this user

    let sql = mysql.format('select o.id,r.name as resname,CONCAT(firstname, ",", lastname) as uname,pref_lang,uoa.email as uemail,device_token,platform from orders as o left join restaurant as r on r.id = o.res_id left join users as u on u.id = o.user_id left join order_address as uoa on uoa.order_id = o.id left join driver_orders as do on do.order_id = o.id where o.id = ? and do.user_id  = ?', [order_id, user_id]);

    //console.log('sql', sql);

    return await query_helper.runQuery(sql).then(async response => {
        if (response && response.length > 0) {
            return await restaurantServices.changeStatus(response, orderstatus, order_id, orderissue).then(resp => {
                // //console.log(resp);
                return res.send(resp)
            })
        } else {
            return res.send({ status: false, msg: "You are not authorise to access order" })
        }
    })
}

const getOnGoingOrders = async function (req, res) {
    let user_id = req.body.user_id ? req.body.user_id : -1;

    let sql = mysql.format("select o.id as order_id,o.res_id,r.name as res_name,restaurantpic,order_delivered,o.status as order_status,DATE_FORMAT(o.created_date,'%Y-%m-%d') as order_date  from driver_orders as do left join orders as o on o.id = do.order_id left join restaurant as r on r.id = o.res_id where do.user_id=? and order_delivered = 0", [user_id])

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "Successfully get", data: response })
        } else {
            return res.send({ status: false, msg: "No orders found " })
        }
    })

}
const orderhistory = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let user_id = req.body.user_id ? req.body.user_id : -1;

    let sql = mysql.format("select o.id as order_id,o.res_id,r.name as res_name,restaurantpic,order_delivered,o.status as order_status,DATE_FORMAT(o.created_date,'%Y-%m-%d') as order_date  from driver_orders as do left join orders as o on o.id = do.order_id left join restaurant as r on r.id = o.res_id where do.user_id=? and order_delivered = 1", [user_id])

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "Successfully get", data: response })
        } else {
            return res.send({ status: false, msg: "No orders found " })
        }
    })
}


module.exports = {
    login,
    registration,
    registrationbySocial,
    forgetPassword,
    resetPassword,
    activeUser,
    userinfo,
    updateProfile,
    orderhistory,
    availForDelivery,
    acceptDelievery,
    updateDriverlocation,
    getOrderDetail,
    pickupRequest,
    changeorderstatus,
    verifyUserCode,
    updatePaymentStatus,
    logout,
    getOnGoingOrders
};
