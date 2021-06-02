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
const stripe = require('stripe')(config.stripeAccountKey);

const login = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let email = req.body.email.trim();
    let sql = mysql.format("select * from `users` where email =? and role='user' limit 1 ", email);
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
            let sql = `INSERT INTO users (name,email,password,role,token) VALUES (${mysql.escape(name)},${mysql.escape(email)},${mysql.escape(hash)},'user',${mysql.escape(token)})`;

            return await query_helper.runQuery(sql).then(async (response) => {

                if (response.insertId && response.insertId > 0) {
                    //send mail to active user
                    mail_helper.mailer(
                        { user_id: response.insertId, name, email, token },
                        "Confirm user registration",
                        "register"
                    );
                    res.send({ status: true, msg: "Registration successful", data: {} });
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
        let role = post.role.trim();


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

        //check if this email not assign to already another user

        await query_helper.runQuery(`select id from users where email = ${mysql.escape(email)} and id != ${mysql.escape(user_id)}`).then(async re => {
            //console.log(re)
            if (re && re.length > 0) {
                return res.send({ status: false, msg: "Email already assign to another user", data: {} });
            } else {
                var sql = `UPDATE users SET  name=${mysql.escape(name)},email = ${mysql.escape(email)},city=${mysql.escape(city)},address = ${mysql.escape(address)}, dob = ${mysql.escape(dob)}, about = ${mysql.escape(about)},	longitude=${mysql.escape(longitude)},latitude=${mysql.escape(latitude)}, pref_lang = ${mysql.escape(pref_lang)}, phone = ${mysql.escape(phone)}${extraProfilepicQuery} WHERE id = ${mysql.escape(user_id)}`;

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
                        return res.send({ status: false, msg: "Unable to update", data: {} });
                    }
                });
            }
        })


    }
}

const getStaticPages = async function (req, res) {
    let pageId = req.query.pageid ? req.query.pageid : -1;
    //get static pages of website
    let sql = `select * from pages where id = ${mysql.escape(pageId)}`;
    return await query_helper.runQuery(sql).then(resp => {
        if (resp && resp.length > 0) {
            res.send({ status: true, msg: " successfully get ", data: { resp } });
        } else {
            res.send({ status: false, msg: "Something went wrong ", data: {} });
        }
    })
}

const suggestCategory = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, category } = req.body;

    let sql = mysql.format("insert into suggest_category(user_id,category) values(?,?)", [user_id, category]);

    return await query_helper.runQuery(sql).then(async response => {
        if (response && response.affectedRows > 0) {
            //get admin detail 
            let adminsql = `select name,email,(select name from users where id = ${user_id}) as username from users where role='admin' and status = 1 limit 1`;
            return await query_helper.runQuery(adminsql).then(resp => {
                mail_helper.mailer(
                    { adminname: resp[0].name, email: resp[0].email, username: resp[0].username, category },
                    "Category Suggestion",
                    "category-suggestion"
                );

                return res.send({ status: true, msg: " Category suggestion successfully submitted  ", data: {} });
            })

        } else
            return res.send({ status: false, msg: " Something went wrong ", data: {} });

    })
}

const logout = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let userId = req.body.user_id ? req.body.user_id : req.query.user_id;

    let sql = mysql.format('update users set device_token = null where id = ?', [userId]);
    //remove device token
    return await query_helper.runQuery(sql).then(response => {
        return res.send({ status: true, msg: "Logged Out Successfully" });
    })

}

const getnotificationsforapp = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { page } = req.body;

    let limit = 20;
    let offset = limit * (page - 1);

    notificationsql = `select msg,DATE_FORMAT(notifications.created_at,'%Y-%m-%d %l:%i %p') as created_at from notifications  where recipient_role = 'user' order by notifications.created_at desc limit ${limit} offset ${offset}`;

    await query_helper.runQuery(notificationsql).then(response => {
        ;
        if (response && response.length > 0)
            return res.send({ status: true, response });
        else
            return res.send({ status: false, response: [] });
    });
}

const contactus = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { firstname, lastname, message } = req.body;
    let uemail = req.body.email;

    //get admin detail 
    let adminsql = `select email,pref_lang from users where role='admin' and status = 1 limit 1`;
    return await query_helper.runQuery(adminsql).then(resp => {

        mail_helper.mailer(
            { firstname, lastname, uemail, message, email: resp[0].email, pref_lang: resp[0].pref_lang },
            { en: "Contact Us Mail", es: "Contáctenos Correo" },
            "contactus"
        );
        return res.send({ status: true, msg: "Email has been send successfully" });

    })

}

const getsiteinfo = async function (req, res) {
    let sql = mysql.format('select * from setting where id = 1');
    let sql2 = `select * from webdata where id = 1`;

    return await query_helper.runMultiQuery([sql, sql2]).then(response => {

        if (response && response.length > 0)
            return res.send({ status: true, msg: "Successfully get", data: response[0][0], webdata: response[1][0] });
        else
            return res.send({ status: false, msg: "Something went wrong " });
    })
}

const addAddress = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { id, firstname, lastname, country, phone, email, city, pincode, houseno, address, state, address2, user_id, lat, lng, formattedAddress } = req.body;

    if (id == -1) {
        let sql = mysql.format('insert into user_address(firstname, lastname, country, phone, city, pincode, houseno, address, state, address2, user_id,lat,lng,formattedAddress,email) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [firstname, lastname, country, phone, city, pincode, houseno, address, state, address2, user_id, lat, lng, formattedAddress, email])

        return await query_helper.runQuery(sql).then(response => {
            //console.log(response)
            if (response && response.affectedRows > 0) {
                return res.send({ status: true, msg: "successfully inserted", insertId: response.insertId })
            } else {
                return res.send({ status: false, msg: "Something went wrong" })
            }
        })
    } else {
        let sql = mysql.format('update user_address set firstname = ?, lastname= ?,email=? ,country= ?, phone= ?, city= ?, pincode= ?, houseno= ?, address= ?, state=?, address2=?, lat=?, lng=?, formattedAddress=? where id = ? and user_id = ? ', [firstname, lastname, email, country, phone, city, pincode, houseno, address, state, address2, lat, lng, formattedAddress, id, user_id])

        return await query_helper.runQuery(sql).then(response => {
            if (response && response.affectedRows > 0) {
                return res.send({ status: true, msg: "successfully updated" })
            } else {
                return res.send({ status: false, msg: "Something went wrong" })
            }
        })
    }
}

const getaddress = async function (req, res) {
    let user_id = req.query.user_id ? req.query.user_id : -1

    let sql = mysql.format('select * from user_address where user_id = ?', [user_id])

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", address: response });
        } else {
            return res.send({ status: false, msg: 'No address found', address: [] });
        }
    })
}

const deleteAddress = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { id, user_id } = req.body

    let sql = mysql.format('delete from user_address where id = ? and user_id = ? ', [id, user_id])

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "delete successfully" })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })
}

const getFaqs = async function (req, res) {
    let sql = `select * from faq`;

    return await query_helper.runQuery(sql).then(response => {
        if (response) {
            return res.send({ status: true, msg: "Get successfully", faqs: response })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })
}

const getOrders = async function (req, res) {
    let user_id = req.query.user_id ? req.query.user_id : -1;
    let page = req.query.page ? req.query.page : 1;

    let limit = 10;
    let offset = limit * (page - 1);

    let sql = mysql.format("select orders.*,DATE_FORMAT(created_date,'%Y-%m-%d') as created_date,r.name as res_name,restaurantpic,r.cancel_charge from orders left join restaurant as r on r.id = orders.res_id where user_id = ? order by id desc limit ? offset ?", [user_id, limit, offset])

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", data: response });
        } else {
            return res.send({ status: false, msg: 'No order found', data: [] });
        }
    })
}

const getTaxs = async function (req, res) {
    let sql = 'select city_tax,state_tax,delivery_charge,driver_fee,pickup_fee from  setting ';

    return await query_helper.runQuery(sql).then(response => {
        if (response) {
            return res.send({ status: true, msg: 'successfully get', data: response[0] })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })
}

const makeReservation = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { user_id, res_id, date, time, people, token } = req.body

    //check if restaurant active that day and time
    let sql = `select res_reservation_slot.* from res_reservation_slot left join restaurant on restaurant.id = res_reservation_slot.res_id where res_id = ${res_id} and date = '${date}' and slot_time = '${time}' and restaurant.status = 1`;

    await query_helper.runQuery(sql).then(async response => {

        if (response && response.length > 0) {

            resvation_slot = response[0]

            //check if seat available
            if (resvation_slot.avail_seat >= people) {


                let paymentdata;

                await stripe.charges.create({
                    amount: 500,
                    currency: 'usd',
                    source: token,
                }).then(async respp => {
                    paymentdata = JSON.stringify(respp);
                    //update for reservation
                    let makeReservationSql = mysql.format(`insert into  reservation (user_id,res_id,date,time,people,confirmed,paymentdata) values(?,?,?,?,?,0,?)`, [user_id, res_id, date, time, people, paymentdata])

                    return await query_helper.runQuery(makeReservationSql).then(async resp => {

                        if (resp && resp.affectedRows > 0) {
                            let tempsql = `update res_reservation_slot set avail_seat = ${resvation_slot.avail_seat - people} where id = ${resvation_slot.id}`;

                            await query_helper.runQuery(tempsql);

                            let getuserEmail = `select email,name,device_token,platform from users where id = ${user_id}`;
                            let getresOwnerEmail = `select email from users where id = (select created_by from restaurant where id = ${res_id})`
                            let getRestaurantName = `select name from restaurant where id = ${res_id}`;

                            await query_helper.runMultiQuery([getuserEmail, getresOwnerEmail, getRestaurantName]).then(async result => {
                                await stripe.charges.update(JSON.parse(paymentdata).id, {
                                    metadata: {
                                        'Reservation id': resp.insertId,
                                        'Restaurant Name': result[2][0].name,
                                        'User Name': result[0][0].name,
                                        'User email': result[0][0].email
                                    }
                                })
                                //send email to user
                                mail_helper.mailer(
                                    { email: result[0][0].email, resname: result[2][0].name, time: time, people },
                                    "Reservation Confirmation",
                                    "makeReservation"
                                );

                                if (result[0][0].device_token && result[0][0].device_token != null && result[0][0].device_token != '')
                                    pushnotification.send_push(result[0][0].device_token, result[0][0].platform, 'Reservation Confirmation', ` You have successfully made Reservation on ${result[2][0].name} at ${time} for ${people} people `, 'makeReservation', '', '');

                                //send email to restaurant Owner
                                mail_helper.mailer(
                                    { email: result[1][0].email, resname: result[2][0].name, time: time, username: result[0][0].name, people },
                                    "New Reservation Found",
                                    "newReservation"
                                );

                                return res.send({ status: true, msg: 'Successfully Reservation' })
                            })


                        } else {
                            return res.send({ status: false, msg: 'something went wrong' })
                        }
                    })
                }).catch(error => {
                    return res.send({ status: false, msg: error.raw.message })
                    paymentStatus = false;
                    // do something in error here
                })

            } else {
                return res.send({ status: false, msg: 'Slot are full' })
            }

        } else {
            return res.send({ status: false, msg: 'Slot are not availale' })
        }

    })
}



const getUserReservation = async function (req, res) {
    let user_id = req.query.user_id ? req.query.user_id : -1;

    //get user reservation

    let sql = mysql.format('select res.name as res_name,restaurantpic,people,date,time,confirmed from reservation left join restaurant as res on res.id = reservation.res_id where user_id = ? ', [user_id])

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "", data: response })
        } else {
            return res.send({ status: false, msg: "No reservation found" })
        }
    })
}

const getSlots = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { res_id, date } = req.body;

    let sql = `select * from res_reservation_slot where res_id = ${res_id} and date = "${date}"`;

    return await query_helper.runQuery(sql).then(response => {
        if (response) {
            return res.send({ status: true, msg: "", data: response })
        } else {
            return res.send({ status: false, msg: "Something went wrong" })
        }
    })
}

const DriverReg = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;


    let { firstname, lastname, email, phone, job_avail, date_can_start, vahical_type } = req.body

    let license = (req.files.license) ? req.files.license[0].path.replace('public/', '') : '';
    let criminalRec = (req.files.criminalRec) ? req.files.criminalRec[0].path.replace('public/', '') : '';

    let sql = mysql.format('insert into driver_reg (firstname, lastname, email, phone, job_avail, date_can_start, vahical_type,license,criminalRec) values(?,?,?,?,?,?,?,?,?)', [firstname, lastname, email, phone, job_avail, date_can_start, vahical_type, license, criminalRec])


    await query_helper.runQuery(sql).then(async response => {
        if (response) {
            //send mail to admin
            let adminsql = `select email,pref_lang from users where role='admin' and status = 1 limit 1`;
            return await query_helper.runQuery(adminsql).then(resp => {
                //console.log(resp)
                mail_helper.mailer(
                    { firstname, lastname, email, phone, email: resp[0].email, pref_lang: resp[0].pref_lang },
                    { es: 'Solicitud de nuevo conductor', en: "New Driver Request" },
                    "newdriver"
                );

                return res.send({ status: true, msg: "success" })
            });
        } else {
            return res.send({ status: false, msg: "failed" })
        }
    })
}

const ResReg = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;


    let { firstname, lastname, email, phone, resname } = req.body

    let fileArr = [];
    let files = "";
    if (req.files && req.files.length > 0) {
        req.files.forEach(element => {
            fileArr.push(element.path.replace('public/', ''))
        });
    }

    files = fileArr.join();

    let sql = mysql.format('insert into resReg (firstname, lastname, email, phone , resname,imgs) values(?,?,?,?,?,?)', [firstname, lastname, email, phone, resname, files])

    await query_helper.runQuery(sql).then(async response => {

        if (response) {
            //send mail to admin
            let adminsql = `select email,pref_lang from users where role='admin' and status = 1 limit 1`;

            return await query_helper.runQuery(adminsql).then(resp => {

                mail_helper.mailer(
                    { firstname, lastname, email, phone, email: resp[0].email, pref_lang: resp[0].pref_lang },
                    { es: 'Nueva solicitud de restaurante', en: 'New Restaurant Request' },
                    "newResReq"
                );

                return res.send({ status: true, msg: "success" })
            });
        } else {
            return res.send({ status: false, msg: "failed" })
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
    getStaticPages,
    changepassword,
    suggestCategory,
    logout, getnotificationsforapp, contactus, getsiteinfo, addAddress, getaddress,
    deleteAddress,
    getFaqs,
    getOrders,
    getTaxs,
    makeReservation,
    getUserReservation,
    getSlots,
    DriverReg,
    ResReg
};
