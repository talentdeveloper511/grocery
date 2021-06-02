const authService = require("../../../services/AuthService");
var mysql = require("mysql");
var bcrypt = require("bcrypt");
var query_helper = require("../../../helpers/database_helper");
var helperFunctions = require("../../../helpers/functions_helper");
var jwt = require("jsonwebtoken");
var config = require("./../../../config/config");
var fieldvalidator = require("../../../middleware/validator");
var { validationResult } = require("express-validator/check");
var mail_helper = require("../../../helpers/mailer_helper");
const { response } = require("express");

const login = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let email = req.body.email.trim();
    let sql = mysql.format("select * from `users` where email =? and role='admin' limit 1 ", email);
    return await authService.authUser(req, sql).then(response => {
        res.send(response);
    });
};

const dashboard = async function (req, res) {

    let totaluser = 0;
    let totalrestaurant = 0;
    let totalfeedback = 0;
    let totalcategory = 0;
    let totalOrders = 0;
    let totalreservation = 0
    //get user count
    usersql = `select count(id) as count from users where role != "admin"`;
    await query_helper.runQuery(usersql).then(response => {
        totaluser = response[0].count;
    });

    restaurantsql = `select count(id) as count from restaurant`;
    await query_helper.runQuery(restaurantsql).then(response => {
        totalrestaurant = response[0].count;
    });

    feedbacksql = `select count(id) as count from user_feedack`;
    await query_helper.runQuery(feedbacksql).then(response => {
        totalfeedback = response[0].count;
    });

    categorysql = `select count(id) as count from category where parent_id = 0`;
    await query_helper.runQuery(categorysql).then(response => {
        totalcategory = response[0].count;
    });

    orderssql = `select count(id) as count from orders where status != 'paymentfailed'`;
    await query_helper.runQuery(orderssql).then(response => {
        totalOrders = response[0].count;
    });

    reservationsql = `select count(id) as count from reservation `;
    await query_helper.runQuery(reservationsql).then(response => {
        totalreservation = response[0].count;
    });

    // notificationsql = `select sender_id,profileimage,name,msg,DATE_FORMAT(notifications.created_at,'%Y-%m-%d %l:%i %p') as created_at from notifications left join users on users.id = notifications.sender_id  where recipient_role = 'admin' order by notifications.created_at desc`;

    // await query_helper.runQuery(notificationsql).then(response => {
    //     notifications = response;
    // });

    return res.send({ resp: { users: totaluser, restaurant: totalrestaurant, feedback: totalfeedback, category: totalcategory, orders: totalOrders, reservation: totalreservation } });
}

const getnotifications = async function (req, res) {
    let { page } = req.query;

    let limit = 20;
    let offset = limit * (page - 1);

    notificationsql = `select sender_id,profileimage,name,msg,DATE_FORMAT(notifications.created_at,'%Y-%m-%d %l:%i %p') as created_at from notifications left join users on users.id = notifications.sender_id  where recipient_role = 'admin' order by notifications.created_at desc limit ${limit} offset ${offset}`;

    await query_helper.runQuery(notificationsql).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, response });
        else
            return res.send({ status: false, response: [] });
    });
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
        var profilepic = "";

        let post = req.body;
        let name = post.name.trim();
        let email = post.email.trim();
        let role = 'admin';
        let city = post.city.trim();
        let address = post.address.trim();
        let phone = post.phone.trim();
        let userid = post.id;

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

            //update the user
            var sql = `UPDATE users SET  name=${mysql.escape(name)},email = ${mysql.escape(email)},role=${mysql.escape(role)},profileimage = ${mysql.escape(profilepic)},city=${mysql.escape(city)},address = ${mysql.escape(address)}, phone = ${mysql.escape(phone)} WHERE id = ${mysql.escape(userid)}`;
        } else {
            //update the user
            var sql = `UPDATE users SET  name=${mysql.escape(name)},email = ${mysql.escape(email)},role=${mysql.escape(role)},city=${mysql.escape(city)},address = ${mysql.escape(address)}, phone = ${mysql.escape(phone)} WHERE id = ${mysql.escape(userid)}`;
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

const changepassword = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { newpassword, oldpassword, loggedInUser_Id } = req.body;
    return await authService.changepassword(loggedInUser_Id, oldpassword, newpassword).then(response => {

        res.send(response);
    })
}

const userlist = async function (req, res) {
    let post = req.body;
    let columns = {
        0: 'id',
        2: 'name',
        3: 'email',
        4: 'role',
        5: 'created_date'
    };

    //get list of all users 
    let sql = `SELECT id,name,email,status,profileimage,role,DATE_FORMAT(created_date,'%Y-%m-%d') as created_date FROM users WHERE role != 'admin'`;

    if (post.search.value) {
        sql +=
            ' AND ( name LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR email LIKE ' +
            mysql.escape('%' + post.search.value + '%') + 'OR CONVERT(created_date,CHAR) LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR role LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ')';
    }
    let query_result_org = await query_helper.runQuery(sql);
    recordTotal = query_result_org.length;
    filterRecord = query_result_org.length;

    sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            res.json({
                status: 200, msg: "user list", data: response, recordsTotal: recordTotal,
                recordsFiltered: filterRecord
            });
        } else {
            res.send({ status: false, msg: "no data found", data: [] });
        }
    });
}

const updateUser = async function (req, res) {

    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;
        var profilepic = "";
        let post = req.body;
        let name = post.name.trim();
        let email = post.email.trim();
        let city = post.city.trim();
        let address = post.address.trim();
        let phone = post.phone.trim();
        let userid = post.id;
        let status = post.status;

        let alreadyProfileFile = "";
        if (req.file) {
            profilepic = req.file.path.replace('public/', '');
            //get already saved file and delete it
            await query_helper.runQuery(`SELECT profileimage FROM users WHERE id = ${mysql.escape(userid)}`).then(response => {
                if (response)
                    alreadyProfileFile = response[0].profileimage;
            });

            //update the user
            var sql = `UPDATE users SET  name=${mysql.escape(name)},status=${mysql.escape(status)},email = ${mysql.escape(email)},profileimage = ${mysql.escape(profilepic)},city=${mysql.escape(city)},address = ${mysql.escape(address)}, phone = ${mysql.escape(phone)} WHERE id = ${mysql.escape(userid)}`;
        } else {
            var sql = `UPDATE users SET  name=${mysql.escape(name)},status=${mysql.escape(status)},email = ${mysql.escape(email)},city=${mysql.escape(city)},address = ${mysql.escape(address)}, phone = ${mysql.escape(phone)} WHERE id = ${mysql.escape(userid)}`;
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

const pagecontent = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let pageId = req.query.pageid ? req.query.pageid : -1;

    let sql = `SELECT * FROM pages WHERE id = ${mysql.escape(pageId)}`;
    return await query_helper.runQuery(sql).then(response => {
        if (response[0]) {
            res.send({
                status: true, msg: "", data: response[0]
            });
        } else {
            res.send({ status: false, msg: "Page is not available", data: {} });
        }
    });
}
const changeStatus = async function (req, res) {
    let post = req.body;
    let userid = post.id;
    let status = post.status

    let sql = `UPDATE users SET status = ${mysql.escape(status)} WHERE id = ${mysql.escape(userid)}`;
    return await query_helper.runQuery(sql).then(async response => {

        if (response.affectedRows && response.affectedRows > 0) {
            if (status == 0) {
                await query_helper.runQuery(`update restaurant set status = ${mysql.escape(status)} where created_by = ${mysql.escape(userid)}`);
                await query_helper.runQuery(`update drivers set avail_for_delivery = 0 where user_id = ${mysql.escape(userid)}`)
            }
            res.send({
                status: 200, msg: "User status update successfully", data: {}
            });
        } else {
            res.send({ status: false, msg: "Unable to update", data: {} });
        }
    });
}


const savecategory = async function (req, res) {
    //check for validation
    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;

        let post = req.body;
        let name = post.name.trim();
        if (post.description)
            var des = post.description.trim();


        var catimg = (req.file && req.file != undefined) ? req.file.path.replace('public/', '') : "";
        if (post.catid && post.catid != -1) {

            var extraQuery = (catimg != "") ? ",catimg='" + catimg + "'" : "";
            var sql = `update category set name = ${mysql.escape(name)} , description = ${mysql.escape(des)} ${extraQuery} where id = ${mysql.escape(post.catid)}`;

        }
        else
            var sql = `insert into category (parent_id,name,description,catimg) values (0,${mysql.escape(name)},${mysql.escape(des)},'${catimg}')`;

        return await query_helper.runQuery(sql).then(async (response) => {

            if (response.affectedRows && response.affectedRows > 0) {
                //get all parent categories 
                let sql = `Select name,description,id,catimg from category where parent_id = 0 order by created_at desc`;
                return await query_helper.runQuery(sql).then(response => {
                    res.send({
                        status: 200, msg: "Category save successfully", data: response
                    });
                })

            } else {
                res.send({ status: false, msg: "Unable to Save", data: {} });
            }
        });
    }

}
const getCategory = async function (req, res) {
    if (req.method == "GET") {
        //Get user ID to detail
        let catId = req.query.catid;

        if (catId && catId > 0 && catId != undefined) {
            let sql = mysql.format("select * from `category` where id =? limit 1", catId);
            return await query_helper.runQuery(sql).then(response => {
                if (response[0]) {
                    res.send({ status: 200, msg: "", data: response[0] });
                } else {
                    res.send({ status: false, msg: "Something went wrong", data: {} });
                }
            });
        } else {
            return (res = { status: false, msg: "Categoy Id not found", data: {} });
        }


    }
}
const deleteCat = async function (req, res) {
    if (req.method == "POST") {
        if (!req.body.catid)
            res.send({ status: false, msg: "Catgory id not found", data: {} });

        let cat_id = req.body.catid;
        if (cat_id > 0) {
            //check if category have subcategories
            let checksubcatSql = mysql.format('select id,name from category where parent_id = ?', cat_id);
            return await query_helper.runQuery(checksubcatSql).then(async (resp) => {
                if (resp && resp.length < 1) {
                    //check if category assign in any restaurant 
                    let checkresSql = mysql.format('select id,name from restaurant where category = ?', cat_id);
                    return await query_helper.runQuery(checkresSql).then(async (resp2) => {
                        if (resp2 && resp2.length < 1) {
                            let sql = ` delete from category where id = ${mysql.escape(cat_id)}`;

                            return await query_helper.runQuery(sql).then(async (response) => {

                                if (response.affectedRows && response.affectedRows > 0) {
                                    //get all parent categories 
                                    let sql = `select name,description,id,catimg from category where parent_id = 0 order by created_at desc`;
                                    return await query_helper.runQuery(sql).then(response => {
                                        res.send({
                                            status: 200, msg: "Category Delete successfully", data: response
                                        });
                                    })

                                } else {
                                    res.send({ status: false, msg: "Unable to Delete", data: {} });
                                }
                            });
                        } else {
                            return res.send({ status: false, msg: `Unable to delete Category have ${resp2[0].name} Restaurant`, data: {} });
                        }
                    });
                } else {
                    return res.send({ status: false, msg: `Unable to delete Category have ${resp[0].name} subcategory`, data: {} });
                }

            })


        }
    }
}
const deleteSubCat = async function (req, res) {
    if (req.method == "POST") {
        if (!req.body.catid)
            res.send({ status: false, msg: "Catgory id not found", data: {} });

        let subcatId = req.body.catid;
        if (subcatId > 0) {


            //check if subcategory is assign in any restaurant 
            sql = `select id,name from restaurant where find_in_set(${mysql.escape(subcatId)},subcategory)`;
            return await query_helper.runQuery(sql).then(async resp => {
                if (resp && resp.length < 1) {

                    //delete sub category here
                    let sql = ` delete from category where id = ${mysql.escape(subcatId)}`;

                    return await query_helper.runQuery(sql).then(async (response) => {

                        if (response.affectedRows && response.affectedRows > 0) {
                            //get all parent categories 
                            let sql = `select name,description,id from category where parent_id > 0 order by created_at desc`;
                            return await query_helper.runQuery(sql).then(response => {
                                res.send({
                                    status: 200, msg: "Category Delete successfully", data: response
                                });
                            })

                        } else {
                            res.send({ status: false, msg: "Unable to delete", data: {} });
                        }
                    });

                } else {
                    return res.send({ status: false, msg: `Unable to delete ,Sub category is used in ${resp[0].name} Restaurant`, data: {} });
                }
            })


        }
    }
}
const getsubcategories = async function (req, res) {
    let sql = `SELECT a.*,b.name as parentcatname FROM category as a LEFT JOIN category b on b.id = a.parent_id WHERE a.parent_id > 0 order by a.created_at desc`;
    return await query_helper.runQuery(sql).then(async (response) => {
        if (response) {
            let sql = `Select name,description,id from category where parent_id = 0 order by created_at desc`;
            return await query_helper.runQuery(sql).then(response2 => {
                if (response) {
                    res.send({
                        status: 200, msg: "", data: { cat: response2, subcat: response }
                    });
                } else {
                    res.send({ status: false, msg: "Unable to get Categories", data: {} });
                }
            })

        } else {
            res.send({ status: false, msg: "Unable to get subCategories", data: {} });
        }
    })
}
const savesubcategory = async function (req, res) {
    //check for validation
    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;

        let post = req.body;
        let name = post.name.trim();
        if (post.description)
            var des = post.description.trim();
        let parentid = post.parentid

        if (post.catid && post.catid != -1)
            var sql = `update category set name = ${mysql.escape(name)} , description = ${mysql.escape(des)}, parent_id = ${mysql.escape(parentid)} where id = ${mysql.escape(post.catid)}`;
        else
            var sql = `insert into category (parent_id,name,description) values (${mysql.escape(parentid)},${mysql.escape(name)},${mysql.escape(des)})`;

        return await query_helper.runQuery(sql).then(async (response) => {

            if (response.affectedRows && response.affectedRows > 0) {
                //get all parent categories 
                let sql = `SELECT a.*,b.name as parentcatname FROM category as a LEFT JOIN category b on b.id = a.parent_id WHERE a.parent_id > 0 order by a.created_at desc`;

                return await query_helper.runQuery(sql).then(response => {
                    res.send({
                        status: 200, msg: "Category save successfully", data: response
                    });
                })

            } else {
                res.send({ status: false, msg: "Unable to Save", data: {} });
            }
        });
    }

}

const pages = async function (req, res) {
    let sql = 'select page,id from pages';
    return await query_helper.runQuery(sql).then(response => {
        return res.send({ status: 200, msg: "", pages: response });
    })
}

const createPage = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let { page, content, page_es, content_es } = req.body;

    let sql = mysql.format('insert into pages(page,content,page_es,content_es) values(?,?,?,?)', [page, content, page_es, content_es]);
    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Successfully inserted", pageId: response.insertId });
        else
            return res.send({ status: false, msg: "Something went wrong " });
    })
}

const updatePage = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { page, content, page_es, content_es, id } = req.body;

    let sql = mysql.format('update pages set page = ? , content = ? , page_es= ? , content_es=? where id = ?', [page, content, page_es, content_es, id]);
    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Successfully Updated", pageId: id });
        else
            return res.send({ status: false, msg: "Something went wrong" });
    })
}

const deleteCatSuggestion = async function (req, res) {
    let suggestion_id = req.body.suggestionid ? req.body.suggestionid : -1;

    let deletesql = `delete from suggest_category where id = ${mysql.escape(suggestion_id)}`;

    return await query_helper.runQuery(deletesql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Successfully Deleted" });
        else
            return res.send({ status: false, msg: "Something went wrong" });
    })
}

const deletefeedback = async function (req, res) {

    let feedback_id = req.query.feedback_id ? req.query.feedback_id : -1;

    let sql = `DELETE FROM user_feedack WHERE id = ${feedback_id}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Successfully Deleted" });
        else
            return res.send({ status: false, msg: "Something went wrong" });
    })
}

const sendgroupmsg = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let { msg, role, loggedInUser_Id } = req.body;

    //save msg as notification in db
    let sql = mysql.format("insert into notifications(sender_id,sender_role,recipient_role,msg) values(?,'owner',?,?)", [loggedInUser_Id, role, msg])

    await query_helper.runQuery(sql).then(async resp => {
        if (role == 'owner') {
            return await authService.sendmsgtoowner(msg, loggedInUser_Id).then(response => {
                res.send(response);
            })
        }
        if (role == 'user') {
            return await authService.sendnotification_to_appuser(msg, loggedInUser_Id).then(response => {
                res.send(response);
            })
        }
    });
}

const updateSetting = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let { email, address, city, contact, city_tax, state_tax, delivery_charge, driver_fee, pickup_fee, whatsapp, fb_link, twitter_link, insta_link } = req.body;

    let sql = mysql.format('update setting set email = ? , address= ?,contact =?,city = ?,city_tax=?,state_tax =? ,delivery_charge=?,driver_fee=?,pickup_fee=?,whatsapp=?,fb_link=?,twitter_link=?,insta_link=? where id = 1', [email, address, contact, city, city_tax, state_tax, delivery_charge, driver_fee, pickup_fee, whatsapp, fb_link, twitter_link, insta_link]);
    return await query_helper.runQuery(sql).then(response => {

        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Successfully updated" });
        else
            return res.send({ status: false, msg: "Something went wrong " });
    })
}

const getSetting = async function (req, res) {
    let sql = mysql.format('select * from setting where id = 1');
    let sql2 = `select * from webdata where id = 1`;

    return await query_helper.runMultiQuery([sql, sql2]).then(response => {

        if (response && response.length > 0)
            return res.send({ status: true, msg: "Successfully get", data: response[0][0], webdata: response[1][0] });
        else
            return res.send({ status: false, msg: "Something went wrong " });
    })
}

const getfaqlist = async function (req, res) {
    let sql = mysql.format('select faq_title,id from faq order by created_date desc');

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", faqs: response })
        } else {
            return res.send({ status: false, msg: "No Faq found" })
        }
    })
}

const addfaq = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { description, title, description_es, title_es, faq_id } = req.body;

    if (faq_id == -1) {
        let sql = mysql.format('insert into faq(faq_title,faq_des,faq_title_es,faq_des_es) values(?,?,?,?)', [title, description, title_es, description_es]);

        return await query_helper.runQuery(sql).then(response => {

            if (response && response.insertId > 0) {
                return res.send({ status: true, msg: "Successfully added", insertId: response.insertId })
            } else {
                return res.send({ status: false, msg: "Something went wrong" })
            }
        })
    } else {
        let sql = mysql.format('update faq set faq_title = ? ,faq_des = ?,faq_title_es = ? ,faq_des_es = ? where id = ? ', [title, description, title_es, description_es, faq_id]);
        return await query_helper.runQuery(sql).then(response => {

            if (response && response.affectedRows > 0) {
                return res.send({
                    status: true, msg: "Successfully updated"
                })
            } else {
                return res.send({ status: false, msg: "Something went wrong" })
            }
        })

    }
}

const getfaqDetail = async function (req, res) {
    let faq_id = req.query.faq_id ? req.query.faq_id : -1;

    let sql = mysql.format('select * from faq where id = ?', [faq_id]);

    return await query_helper.runQuery(sql).then(response => {

        if (response) {
            return res.send({ status: true, msg: "Successfully get", data: response[0] })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })
}

const deletefaq = async function (req, res) {
    let faq_id = req.query.faq_id ? req.query.faq_id : -1;

    let sql = mysql.format('delete from faq where id = ?', [faq_id]);

    return await query_helper.runQuery(sql).then(response => {

        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "Successfully deleted" })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })
}

const getOwnerlist = async function (req, res) {

    let sql = "select id,name from users where role = 'owner' and status = 1";

    return await query_helper.runQuery(sql).then(response => {

        if (response) {
            return res.send({ status: true, msg: "Successfully deleted", response })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })
}

const changeOwner = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { ownerId, res_id, claimedstatus } = req.body

    let claimed = (claimedstatus) ? 1 : 0

    let sql = mysql.format('update restaurant set claimed = ? , created_by = ? where id = ?', [claimed, ownerId, res_id]);

    return await query_helper.runQuery(sql).then(async response => {
        if (response && response.affectedRows > 0) {

            // mail_helper.mailer(
            //     { user_id: response.insertId, name, email, token },
            //     "Confirm user registration",
            //     "claim"
            // );

            //update editor user also
            await query_helper.runQuery(`update editors set owner_id = ${mysql.escape(ownerId)} where res_id = ${mysql.escape(res_id)}`)

            return res.send({ status: true, msg: "successfully updated" })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })

}

const getOrders = async function (req, res) {

    if (req.method == "POST") {
        let post = req.body;


        let columns = {
            1: 'orderid',
            2: 'username',
            3: 'res_name',
            4: 'created_at'
        };

        let sql = `SELECT DATE_FORMAT(o.created_date,'%Y-%m-%d') as created_at,o.total as order_total,u.name as username,r.id as res_id,r.name as res_name,o.id as orderid,o.status as status FROM orders as o left join  restaurant as r on r.id = o.res_id left join users as u on u.id = o.user_id  WHERE res_id in (select id from restaurant )`;

        if (post.search.value) {
            sql +=
                ' AND username LIKE ' +
                mysql.escape('%' + post.search.value + '%') +
                ' OR res_name LIKE ' +
                mysql.escape('%' + post.search.value + '%') +
                ' OR orderid = ' + post.search.value +
                " OR CONVERT(restaurant.created_at,CHAR) LIKE " +
                mysql.escape('%' + post.search.value + '%') + '';
        }

        let query_result_org = await query_helper.runQuery(sql);
        recordTotal = query_result_org.length;
        filterRecord = query_result_org.length;

        sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir}, o.id DESC LIMIT ${post.start} , ${post.length}`;

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

    }
}

const driverList = async function (req, res) {
    let post = req.body;
    let columns = {
        0: 'id',
        1: 'name',
        2: 'email',
        3: 'created_date'
    };

    //get list of all users 
    let sql = `SELECT id,firstname,lastname,email,DATE_FORMAT(created_date,'%Y-%m-%d') as created_date FROM driver_reg `;

    if (post.search.value) {
        sql +=
            'Where ( firstname LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR lastname LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR email LIKE ' +
            mysql.escape('%' + post.search.value + '%') + 'OR CONVERT(created_date,CHAR) LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ')';
    }
    let query_result_org = await query_helper.runQuery(sql);
    recordTotal = query_result_org.length;
    filterRecord = query_result_org.length;

    sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;


    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            res.json({
                status: 200, msg: "user list", data: response, recordsTotal: recordTotal,
                recordsFiltered: filterRecord
            });
        } else {
            res.send({ status: false, msg: "no data found", data: [] });
        }
    });
}

const getresRegList = async function (req, res) {
    let post = req.body;
    let columns = {
        0: 'id',
        1: 'name',
        2: 'email',
        3: 'created_date'
    };

    //get list of all users 
    let sql = `SELECT id,firstname,lastname,email,DATE_FORMAT(created_date,'%Y-%m-%d') as created_date FROM resReg `;

    if (post.search.value) {
        sql +=
            'Where ( firstname LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR lastname LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR email LIKE ' +
            mysql.escape('%' + post.search.value + '%') + 'OR CONVERT(created_date,CHAR) LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ')';
    }
    let query_result_org = await query_helper.runQuery(sql);
    recordTotal = query_result_org.length;
    filterRecord = query_result_org.length;

    sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;


    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            res.json({
                status: 200, msg: "user list", data: response, recordsTotal: recordTotal,
                recordsFiltered: filterRecord
            });
        } else {
            res.send({ status: false, msg: "no data found", data: [] });
        }
    });
}

const driverDetail = async function (req, res) {

    let driver = (req.query.driver_id) ? req.query.driver_id : -1;

    let sql = `select * from driver_reg where id = ${driver}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response) {
            return res.send({ status: true, msg: '', data: response[0] })
        } else {
            return res.send({ status: false, msg: "Something went wrong", data: [] })
        }
    })
}

const getresreg = async function (req, res) {
    let id = (req.query.id) ? req.query.id : -1;

    let sql = `select * from resReg where id = ${id}`;

    return await query_helper.runQuery(sql).then(response => {

        if (response) {
            return res.send({ status: true, msg: '', data: response[0] })
        } else {
            return res.send({ status: false, msg: "Something went wrong", data: [] })
        }
    })
}

const SetWebdata = async function (req, res) {


    let { f_l_en, f_l_es, f_r_en, f_r_es, f_d_h_en, f_d_d_en, f_d_h_es, f_d_d_es, b_h_en, b_h_es, b_c_en, b_c_es } = req.body;
    let addsql = '';
    if (req.file) {
        addsql = ", pic = '" + req.file.path.replace('public/', '') + "'";
    }


    let sql = mysql.format(`update webdata set f_l_en = ? , f_l_es = ? , f_r_en = ? ,f_r_es = ?,f_d_h_en= ?, f_d_d_en = ?, f_d_h_es = ?, f_d_d_es = ?,b_h_en=?,b_h_es=?,b_c_en=?,b_c_es=? ${addsql} where id = 1`, [f_l_en, f_l_es, f_r_en, f_r_es, f_d_h_en, f_d_d_en, f_d_h_es, f_d_d_es, b_h_en, b_h_es, b_c_en, b_c_es]);


    return await query_helper.runQuery(sql).then(resp => {
        if (resp && resp.affectedRows > 0)
            return res.send({ status: true, msg: 'successfully updated' })
        else
            return res.send({ status: false, msg: 'Something went wrong' })
    })
}

const invoiceImages = async function (req, res) {
    //console.log("reqUpload", req.files)
    const { files } = req;
  
    if (!files) {
        return res.send({ status: false, msg: 'Something went wrong' })
    }
    return res.send({ status: true, msg: 'successfully uploaded' })
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
            let sql = `SELECT DATE_FORMAT(rev.created_date,'%Y-%m-%d') as created_at,u.name as username,r.id as res_id,r.name as res_name,rev.id as revid FROM reservation as rev left join restaurant as r on r.id = rev.res_id left join users as u on u.id = rev.user_id `;

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

const changeOwnerPermission = async function (req, res) {
    let { res_id, editallow } = req.body;

    //change permission of restaurant 
    let sql = `update restaurant set can_edit_menu = ${editallow.menu} ,can_edit_reservation = ${editallow.reservation} , can_edit_order = ${editallow.order},can_edit_discount= ${editallow.Discount} where id=${res_id}`;

    return await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "Update Successfully" })
        } else {
            return res.send({ status: false, msg: "Something went wrong" })
        }
    })
}





/***************************************************Drivers Function ***************************************************/
const driverlists = async function (req, res) {
    let post = req.body;
    let columns = {
        0: 'id',
        2: 'name',
        3: 'email',
        4: 'created_date'
    };

    //get list of all users 
    let sql = `SELECT id,name,email,status,profileimage, DATE_FORMAT(created_date,'%Y-%m-%d') as created_date FROM users WHERE role = 'driver'`;

    if (post.search.value) {
        sql +=
            ' AND ( name LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR email LIKE ' +
            mysql.escape('%' + post.search.value + '%') + 'OR CONVERT(created_date,CHAR) LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ')';
    }
    let query_result_org = await query_helper.runQuery(sql);
    recordTotal = query_result_org.length;
    filterRecord = query_result_org.length;

    sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

    return await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.length > 0) {
            res.json({
                status: 200, msg: "user list", data: response, recordsTotal: recordTotal,
                recordsFiltered: filterRecord
            });
        } else {
            res.send({ status: false, msg: "no data found", data: [] });
        }
    });

}


const getdriverOrders = async function (req, res) {
    let post = req.body;
    let driver_id = req.query.driver_id ? req.query.driver_id : -1;

    let columns = {
        0: 'id',
        1: 'order_id',
        2: 'res_name',
        3: 'created_date'
    };

    //get list of all users 
    let sql = `SELECT do.id as id,driver_paid,do.res_id,do.order_id,earn_payment,do.order_delivered,r.name as res_name,DATE_FORMAT(created_date,'%Y-%m-%d') as created_date FROM driver_orders as do left join restaurant as r on r.id = do.res_id  WHERE user_id = ${driver_id}`;

    if (post.search.value) {
        sql +=
            ' AND ( name LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ' OR email LIKE ' +
            mysql.escape('%' + post.search.value + '%') + 'OR CONVERT(created_date,CHAR) LIKE ' +
            mysql.escape('%' + post.search.value + '%') + ')';
    }

    if (post.startDate && post.startDate != 'Invalid date' && post.endDate && post.endDate != 'Invalid date') {
        sql += ` AND (do.created_date > ${mysql.escape(post.startDate)} AND do.created_date < ${mysql.escape(post.endDate)}) `
    }

    let query_result_org = await query_helper.runQuery(sql);

    let total_earn_payment = 0;
    let total_pending_pay = 0;
    let total_Paid = 0;
    query_result_org.forEach(e => {
        if (e.driver_paid == 'paid')
            total_Paid += Number(e.earn_payment)

        if (e.driver_paid == 'pending')
            total_pending_pay += Number(e.earn_payment)

        total_earn_payment += Number(e.earn_payment)
    })

    recordTotal = query_result_org.length;
    filterRecord = query_result_org.length;

    sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

    return await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.length > 0) {
            res.json({
                status: 200, msg: "driver order list", data: response, recordsTotal: recordTotal,
                recordsFiltered: filterRecord, total_earn_payment, total_pending_pay, total_Paid
            });
        } else {
            res.send({ status: false, msg: "no data found", data: [] });
        }
    });

}

const paydriver = async function (req, res) {
    let id = req.body.id ? req.body.id : -1

    let sql = `update driver_orders set driver_paid = 'paid' where id = ${id}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: 'Successfully updated' })
        } else {
            return res.send({ status: false, msg: 'Something went wrong' })
        }
    })
}

const saveStripeAccount = async function (req, res) {
    let res_id = req.body.res_id ? req.body.res_id : -1;
    let stripe_acc = req.body.stripe_acc ? req.body.stripe_acc : -1;

    let sql = `update restaurant set stripe_acc = ${mysql.escape(stripe_acc)} where id = ${mysql.escape(res_id)}`

    await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: 'Successfully updated' })
        } else {
            return res.send({ status: false, msg: 'Something went wrong' })
        }
    })
}

const saveAthAccount = async function (req, res) {
    let res_id = req.body.res_id ? req.body.res_id : -1;
    let ath_acc = req.body.ath_acc ? req.body.ath_acc : -1;
    let ath_secret = req.body.ath_secret ? req.body.ath_secret : -1;

    let sql = `update restaurant set ath_acc = ${mysql.escape(ath_acc)}, ath_secret = ${mysql.escape(ath_secret)} where id = ${mysql.escape(res_id)}`

    await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: 'Successfully updated' })
        } else {
            return res.send({ status: false, msg: 'Something went wrong' })
        }
    })
}


module.exports = {
    dashboard, getnotifications,
    login,
    userinfo,
    updateProfile, changepassword,
    userlist,
    updateUser,
    pagecontent,
    changeStatus, savecategory, getCategory, deleteCat, getsubcategories, savesubcategory, deleteSubCat, pages, createPage, updatePage, deleteCatSuggestion, deletefeedback, sendgroupmsg, updateSetting, getSetting, getfaqlist, addfaq, getfaqDetail, deletefaq, getOwnerlist,
    changeOwner, getOrders, driverList, driverDetail, getresRegList, getresreg, SetWebdata, invoiceImages, getReservation, changeOwnerPermission, driverlists, getdriverOrders, paydriver, saveStripeAccount, saveAthAccount
};
