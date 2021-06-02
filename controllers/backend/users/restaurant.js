restaurantServices = require('../../../services/restaurantService');
var query_helper = require("../../../helpers/database_helper");
var helperFunctions = require("../../../helpers/functions_helper");
var config = require("../../../config/config");
var bcrypt = require("bcrypt");
var fieldvalidator = require("../../../middleware/validator");
var mysql = require("mysql");
var sharp = require('sharp');
var path = require("path");
const { response } = require('express');
const readXlsxFile = require('read-excel-file/node');
const XLSX = require('xlsx')
var jwt = require("jsonwebtoken");
const pushnotification = require('../../../helpers/notification');
const driver_notification = require('../../../helpers/driver_notification');
const fs = require("fs");

const getrestaurantlist = async function (req, res) {

    if (req.method == "POST") {
        let post = req.body;
        //Get user ID to detail
        let userID = req.query.userid;
        //check if token userid and query id are equal 
        if (req.userData.userid && userID && req.userData.userid != userID)
            res.send({ status: false, msg: "You are not authrize", data: {} });

        let columns = {
            0: 'created_at',
            2: 'name',
            3: 'created_at'
        };

        if (userID && userID > 0 && userID != undefined) {
            let sql = `SELECT *,DATE_FORMAT(created_at,'%Y-%m-%d') as created_at FROM restaurant WHERE created_by = ${mysql.escape(userID)}`;

            if (post.search.value) {
                sql +=
                    ' AND name LIKE ' +
                    mysql.escape('%' + post.search.value + '%') +
                    "OR CONVERT(restaurant.created_at,CHAR) LIKE " +
                    mysql.escape('%' + post.search.value + '%') + '';
            }

            let query_result_org = await query_helper.runQuery(sql);
            recordTotal = query_result_org.length;
            filterRecord = query_result_org.length;

            sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir}, restaurant.id DESC LIMIT ${post.start} , ${post.length}`;

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

const getuserrestaurants = async function (req, res) {
    let userID = req.query.loggedInUser_Id;

    await query_helper.runQuery(`select role from users where id = ${mysql.escape(userID)}`).then(async respp => {

        let sql = `SELECT id,name FROM restaurant WHERE status = 1 `;
        if (respp[0].role == 'owner')
            sql += `and created_by = ${mysql.escape(userID)}`;

        sql += `order by name`;

        return await query_helper.runQuery(sql).then(response => {
            if (response) {
                res.send({ status: 200, msg: "", data: response });
            } else {
                res.send({ status: false, msg: "Unable to get Stores", data: {} });
            }
        })

    })


}

const getcategories = async function (req, res) {
    let sql = `Select name,description,id,catimg from category where parent_id = 0 order by created_at`;
    return await query_helper.runQuery(sql).then(response => {
        if (response) {
            res.send({
                status: 200, msg: "", data: response
            });
        } else {
            res.send({ status: false, msg: "Unable to get Categories", data: {} });
        }
    })
}
const saveRestaurant = async function (req, res) {
    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;
        var restraurentpic = "";
        let { name, address, avaragecost, website, contact, city, lng, lat, category, subcategory, status, descriptiones, description, created_by, email, cod, driveremail, min_order_value, max_order_value, cancel_charge } = req.body;

        let { monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time } = req.body;

        if (req.file) {

            restraurentpic = req.file.path.replace('public/', '');
        }

        var sql = `INSERT INTO restaurant (name,email,driveremail,description,description_es,status,created_by,restaurantpic,address,category,subcategory,latitude,longitude,city,website,contact,avg_cost,cod,min_order_value,max_order_value,cancel_charge) VALUES (${mysql.escape(name)},${mysql.escape(email)},${mysql.escape(driveremail)},${mysql.escape(description)},${mysql.escape(descriptiones)} ,${mysql.escape(status)} ,${mysql.escape(created_by)} ,${mysql.escape(restraurentpic)} ,${mysql.escape(address)} ,${mysql.escape(category)},${mysql.escape(subcategory)},${mysql.escape(lat)},${mysql.escape(lng)},${mysql.escape(city)},${mysql.escape(website)},${mysql.escape(contact)},${mysql.escape(avaragecost)},${mysql.escape(cod)},${mysql.escape(min_order_value)},${mysql.escape(max_order_value)},${cancel_charge})`;

        //console.log(sql)
        return await query_helper.runQuery(sql).then(async response => {
            //console.log(response)
            if (response.affectedRows && response.affectedRows > 0) {
                let saverestaurantTimesql = mysql.format('insert into res_openclose_time(res_id,monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [response.insertId, monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time]);
                return await query_helper.runQuery(saverestaurantTimesql).then(resp => {

                    return res.send({
                        status: true, msg: "Store created successfully", data: {}
                    });
                });
            } else {
                res.send({ status: false, msg: "Unable to create", data: {} });
            }
        });
    }
}

const updateRestaurant = async function (req, res) {
    if (req.method == "POST") {
        if (!fieldvalidator.validationErrors(req, res))
            return;

        var restraurentpic = "";
        let post = req.body;
        if (post.res_id && parseInt(post.res_id) < 0)
            return res.send({ status: false, msg: "store id not found", data: {} });
        let res_id = post.res_id;

        let { name, address, avaragecost, website, contact, city, lng, lat, category, subcategory, status, descriptiones, description, email, cod, driveremail, min_order_value, max_order_value, cancel_charge } = req.body;

        let { monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time } = req.body;

        let alreadyrestaurantimage = "";
        if (req.file) {
            restraurentpic = req.file.path.replace('public/', '');
            //get already saved file and delete it
            await query_helper.runQuery(`SELECT restaurantpic FROM restaurant WHERE id = ${mysql.escape(res_id)}`).then(response => {
                if (response)
                    alreadyrestaurantimage = response[0].restaurantpic;
            });
            var sql = `UPDATE restaurant SET  name=${mysql.escape(name)} , email=${mysql.escape(email)} , driveremail=${mysql.escape(driveremail)} ,description=${mysql.escape(description)},description_es=${mysql.escape(descriptiones)}, status=${mysql.escape(status)}, restaurantpic=${mysql.escape(restraurentpic)},address=${mysql.escape(address)},category=${mysql.escape(category)},subcategory=${mysql.escape(subcategory)},latitude=${mysql.escape(lat)},longitude=${mysql.escape(lng)},cod=${mysql.escape(cod)},city=${mysql.escape(city)},contact=${mysql.escape(contact)},cancel_charge=${cancel_charge},avg_cost = ${mysql.escape(avaragecost)},website=${mysql.escape(website)},min_order_value=${mysql.escape(min_order_value)},max_order_value=${mysql.escape(max_order_value)} where id = ${mysql.escape(res_id)}`;
        } else {
            var sql = `UPDATE restaurant SET  name=${mysql.escape(name)},email=${mysql.escape(email)} , driveremail=${mysql.escape(driveremail)} , description=${mysql.escape(description)},description_es=${mysql.escape(descriptiones)}, status=${mysql.escape(status)},address=${mysql.escape(address)},category=${mysql.escape(category)},subcategory=${mysql.escape(subcategory)},latitude=${mysql.escape(lat)},longitude=${mysql.escape(lng)},cod=${mysql.escape(cod)},city=${mysql.escape(city)},cancel_charge=${cancel_charge},contact=${mysql.escape(contact)},avg_cost = ${mysql.escape(avaragecost)},website=${mysql.escape(website)},min_order_value=${mysql.escape(min_order_value)},max_order_value=${mysql.escape(max_order_value)} where id = ${mysql.escape(res_id)}`;
        }

        return await query_helper.runQuery(sql).then(async response => {
            //console.log(response)
            if (response.affectedRows && response.affectedRows > 0) {
                if (alreadyrestaurantimage != "")
                    helperFunctions.deleteFile('public/' + alreadyrestaurantimage);

                //check if res_openclose available
                await query_helper.runQuery(`select id from res_openclose_time where res_id =${res_id}`).then(async ressp => {
                    if (ressp && ressp.length > 0) {
                        //console.log('in update')
                        var saverestaurantTimesql = mysql.format('update res_openclose_time set monopen_time = ?, monclose_time = ?, tueopen_time = ?, tueclose_time = ?, wedopen_time = ?, wedclose_time = ?, thuopen_time = ?, thuclose_time = ?, friopen_time = ?, friclose_time = ?, satopen_time = ?, satclose_time = ?, sunopen_time = ?, sunclose_time = ? where res_id = ?', [monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time, res_id])
                    } else {
                        //console.log('in insert')
                        var saverestaurantTimesql = mysql.format('insert into res_openclose_time ( monopen_time , monclose_time , tueopen_time , tueclose_time , wedopen_time , wedclose_time , thuopen_time , thuclose_time , friopen_time , friclose_time , satopen_time , satclose_time , sunopen_time , sunclose_time ,res_id) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time, res_id])

                    }


                    return await query_helper.runQuery(saverestaurantTimesql).then(resp => {
                        //console.log(resp)
                        return res.send({
                            status: true, msg: "store Updated successfully", data: {}
                        });
                    });;

                })


            } else {
                res.send({ status: false, msg: "Unable to upate", data: {} });
            }
        });
    }
}
const changerestaurantStatus = async function (req, res) {
    let post = req.body;
    let restaurantid = post.id;
    let status = post.status

    let sql = `UPDATE restaurant SET status = ${mysql.escape(status)} WHERE id = ${mysql.escape(restaurantid)}`;
    return await query_helper.runQuery(sql).then(response => {
        if (response.affectedRows && response.affectedRows > 0) {
            res.send({
                status: 200, msg: "store status update successfully", data: {}
            });
        } else {
            res.send({ status: false, msg: "Unable to update", data: {} });
        }
    });
}

const getrestaurant = async function (req, res) {
    if (req.method == "GET") {
        //get req params
        if (req.query.res_id) var res_id = parseInt(req.query.res_id); else return;

        if (req.query.userid) var userid = parseInt(req.query.userid); else return;

        let sql = `select restaurant.*,monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time from restaurant left join res_openclose_time on res_openclose_time.res_id = restaurant.id where restaurant.id = ${mysql.escape(res_id)} and created_by = ${mysql.escape(userid)} limit 1 `;
        return await query_helper.runQuery(sql).then(async response => {

            if (response[0]) {
                //get subcategoris array
                let selectedSubcatQuery = `select id, name from category where id in (${response[0].subcategory})`;

                return await query_helper.runQuery(selectedSubcatQuery).then(resp => {
                    if (resp && resp.length > 0)
                        res.send({
                            status: 200, msg: "", data: response[0], subcat: resp
                        });
                    else
                        res.send({
                            status: 200, msg: "", data: response[0], subcat: {}
                        });
                })

            } else {
                res.send({ status: false, msg: "store not found", data: {} });
            }
        })


    }
}

const getsubcategory = async function (req, res) {
    if (req.method == "GET") {
        //get cat id 
        if (req.query.catid) {
            let catid = req.query.catid;
            let sql = `select id,name from category where parent_id = ${mysql.escape(catid)}`;
            return await query_helper.runQuery(sql).then(response => {
                if (response) {
                    res.send({
                        status: 200, msg: "Store created successfully", subcategories: response
                    });
                } else {
                    res.send({ status: false, msg: "Unable to get", data: {} });
                }
            });
        }
    }
}
const getrestaurantgroups = async function (req, res) {
    if (req.method == "GET") {
        if (req.query.resid) {
            let resid = req.query.resid;
            //check if restaurant related to loggedInuser
            let loggedInuser = req.userData.userid;
            let userRole = 'owner';
            //check loggedIn user Role
            await query_helper.runQuery(`select role from users where id = ${mysql.escape(loggedInuser)}`).then(r => {
                userRole = 'admin'
            })

            let sql = `select * from restaurant where id = ${mysql.escape(resid)}  limit 1 `;
            await query_helper.runQuery(sql).then(async (response) => {
                if (response && response.length > 0) {
                    if (userRole != 'admin' && response[0].created_by != loggedInuser)
                        return res.send({ status: false, msg: "You are not allow to edit " })
                    if (userRole != 'admin' && response[0].can_edit_menu != 1)
                        return res.send({ status: false, msg: "You are not allow to edit " })
                    return await (restaurantServices.getGroupCategory(resid)).then(resp => {
                        res.send(resp);
                    });
                } else {
                    return res.send({ 'status': false, msg: "You are not owner of this store" });

                }
            });

        }
    }
}


const getmenuGroup = async function (req, res) {
    if (req.method == "GET") {
        if (req.query.resid) {
            let resid = req.query.resid;
            //check if restaurant related to loggedInuser
            let loggedInuser = req.userData.userid;
            let userRole = 'owner';
            //check loggedIn user Role
            await query_helper.runQuery(`select role from users where id = ${mysql.escape(loggedInuser)}`).then(r => {
                userRole = 'admin'
            })

            let sql = `select * from restaurant where id = ${mysql.escape(resid)} limit 1 `;
            await query_helper.runQuery(sql).then(async (response) => {
                if (response && response.length > 0) {
                    if (userRole != 'admin' && response[0].created_by != loggedInuser)
                        return res.send({ status: false, msg: "You are not allow " })
                    if (userRole != 'admin' && response[0].can_edit_menu != 1)
                        return res.send({ status: false, msg: "You are not allow " })
                    return await (restaurantServices.getmenuGroup(resid, req.query.groupid)).then(resp => {
                        res.send(resp);
                    });
                } else {
                    return res.send({ 'status': false, msg: "something went wrong" });
                }
            });

        }
    }
}

const getGroupCustomization = async function (req, res) {
    if (req.method == "GET") {
        if (req.query.resid) {
            let resid = req.query.resid;
            //check if restaurant related to loggedInuser
            let loggedInuser = req.userData.userid;
            let sql = `select * from restaurant where id = ${mysql.escape(resid)} and created_by = ${mysql.escape(loggedInuser)} or role='admin' limit 1 `;
            await query_helper.runQuery(sql).then(async (response) => {
                if (response && response.length < 1)
                    return res.send({ 'status': false, msg: "You are not owner" });
                return await (restaurantServices.getmenuCustomization(resid, req.query.groupid)).then(resp => {
                    res.send(resp);
                });
            });

        }
    }
}


const getCustomizationDetail = async function (req, res) {
    let id = req.body.id ? req.body.id : 0

    let sql = `select * from customization where id =  ${id}`;
    let sql2 = `select * from customize_items where customization_id = ${id}`

    return await query_helper.runMultiQuery([sql, sql2]).then(response => {

        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfully get", customize: response[0], options: response[1] })
        else
            return res.send({ status: false, msg: "something went wrong" })
    })
}



const deleteGroup = async function (req, res) {
    if (req.method == "GET") {
        if (req.query.resid) {
            let resid = req.query.resid;
            //check if restaurant related to loggedInuser
            let loggedInuser = req.userData.userid;
            let sql = `select * from restaurant where id = ${mysql.escape(resid)} and created_by = ${mysql.escape(loggedInuser)} limit 1 `;
            await query_helper.runQuery(sql).then(async (response) => {
                if (response && response.length < 1)
                    return res.send({ 'status': false, msg: "You are not owner" });
                return await (restaurantServices.deletemenuGroup(resid, req.query.groupid)).then(resp => {
                    res.send(resp);
                });
            });
        }
    }
}


const deleteCustomization = async function (req, res) {
    if (req.method == "GET") {
        if (req.query.resid) {
            let resid = req.query.resid;
            let id = req.query.id ? req.query.id : -1;
            //check if restaurant related to loggedInuser
            let loggedInuser = req.userData.userid;
            let sql = `select * from restaurant where id = ${mysql.escape(resid)} and created_by = ${mysql.escape(loggedInuser)} limit 1 `;
            return await query_helper.runQuery(sql).then(async (response) => {
                if (response && response.length < 1)
                    return res.send({ 'status': false, msg: "You are not owner" });

                //delete all customizations and data

                sql1 = `delete from customization where id = ${id}`;
                sql2 = `delete from customize_items where customization_id = ${id}`;


                return await query_helper.runMultiQuery([sql1, sql2]).then(resp => {
                    ;
                    if (resp && resp.length > 0) {
                        return res.send({ status: true, msg: "successfully deleted" })
                    } else {
                        return res.send({ status: false, msg: 'something went wrong' })
                    }
                })
            });
        }
    }
}

const creategroup = async function (req, res) {
    if (req.method == "POST") {
        if (req.body.resid) {

            // if (JSON.parse(req.body.items).length < 1)
            //     return res.send({ status: false, msg: 'no items found for group' })

            let resid = req.body.resid;
            //check if restaurant related to loggedInuser
            let loggedInuser = req.userData.userid;
            let sql = `select * from restaurant where id = ${mysql.escape(resid)} and created_by = ${mysql.escape(loggedInuser)} limit 1 `;

            await query_helper.runQuery(sql).then(async (response) => {
                if (response && response.length < 1)
                    return res.send({ 'status': false, msg: "You are not owner" });

                //parse json stringify item
                req.body.items = JSON.parse(req.body.items);
                itemPics = [];
                req.body['groupPic'] = null
                groupPic = null;
                req.files.forEach(e => {
                    if (e.fieldname != 'groupPic')
                        itemPics.push(e)
                    else {
                        groupPic = e;
                    }
                })


                if (itemPics && itemPics.length > 0) {
                    await helperFunctions.sharpFile(itemPics, 250, 250).then(async resp => {
                        if (resp && resp.length > 0) {
                            resp.map((item, index) => {
                                fileIndex = item.substr(item.lastIndexOf("_") + 1).split('-')[0];
                                req.body.items[fileIndex].itempic = item;
                            })
                        }
                    })
                }
                if (groupPic) {
                    await helperFunctions.createsharpfile(groupPic, 800, 100).then(async resp => {
                        //console.log(resp)
                        if (resp && resp.length > 0) {
                            req.body['groupPic'] = groupPic.destination.replace('public/', '') + '/' + resp
                        }
                    })
                }
                return await (restaurantServices.CreateGroup(req.body)).then(resp => {
                    res.send(resp);
                });

            });

        }
    }
}

const deleteRestaurant = async function (req, res) {
    if (req.method == "POST") {
        let restaurantId = req.body.res_id;
        //check if restaurant related to loggedInuser
        let loggedInuser = req.userData.userid;
        let sql = mysql.format('select * from restaurant where id = ? and created_by = ? } limit 1 ', [restaurantId, loggedInuser])

        await query_helper.runQuery(sql).then(async (response) => {
            if (response && response.length < 1)
                return res.send({ 'status': false, msg: "You are not owner" });

            return await restaurantServices.DeleteRestaurant(restaurantId).then(resp => {
                return res.send(resp);
            });
        });

    }
}

const getPromoAdvert = async function (req, res) {
    let userid = (req.userData.userid) ? parseInt(req.userData.userid) : -1;

    let sql = mysql.format("select promo_advert.*,DATE_FORMAT(promo_advert.start_date, '%Y-%m-%d') as start_date,DATE_FORMAT(promo_advert.end_date, '%Y-%m-%d') as end_date,restaurant.name as restaurant_name from promo_advert left join restaurant on promo_advert.restaurant_id = restaurant.id where user_id = ? order by promo_advert.id desc", [userid]);

    return await query_helper.runQuery(sql).then(response => {

        if (response)
            return res.send({ status: true, msg: "successfully get", adverts: response });
        else
            return res.send({ status: false, msg: "something went wrong" });
    })

}

const addPromoAdvert = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let { restaurant_id, distance, start_date, end_date, advertId } = req.body;


    advertpic = (req.file) ? req.file.path.replace('public/', '') : "";

    if (advertId == -1 && !req.file) {
        return res.send({ status: false, msg: 'Image not found' });
    }

    //create sql for add and edit diffrent
    if (advertId == -1)
        var sql = mysql.format('insert into promo_advert(pic,start_date,end_date,restaurant_id,distance,user_id) values (?,?,?,?,?,?)', [advertpic, start_date, end_date, restaurant_id, distance, req.userData.userid]);
    else {
        var extraQuery = (advertpic != "") ? `,pic = ${mysql.escape(advertpic)}` : "";
        var sql = `update promo_advert set start_date = ${mysql.escape(start_date)},end_date= ${mysql.escape(end_date)} ,distance = ${mysql.escape(distance)}, restaurant_id = ${restaurant_id} ${extraQuery} where id = ${advertId} `;

    }

    var added = false;
    await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0) {
            added = true;
        }

    });

    if (added) {
        let advertsql = mysql.format("select promo_advert.*,DATE_FORMAT(promo_advert.start_date, '%Y-%m-%d') as start_date,DATE_FORMAT(promo_advert.end_date, '%Y-%m-%d') as end_date,restaurant.name as restaurant_name from promo_advert left join restaurant on promo_advert.restaurant_id = restaurant.id where user_id = ? order by promo_advert.id desc", [req.userData.userid]);

        return await query_helper.runQuery(advertsql).then(resp => {
            if (resp && resp.length > 0) {
                return res.send({ status: true, msg: "successfully added", adverts: resp });
            } else {
                return res.send({ status: false, msg: "something went wrong" });
            }
        })
    } else {
        return res.send({ status: false, msg: "something went wrong" });
    }

}

const getadvertById = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let advertid = (req.body.id) ? req.body.id : -1;
    let userid = (req.userData.userid) ? req.userData.userid : -1;

    let sql = mysql.format('select * from promo_advert where id = ? and user_id = ?', [advertid, userid]);
    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", response: response[0] })
        } else {
            return res.send({ status: false, msg: "something went wrong" });
        }
    })
}

const deleteAdvert = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let { advert_id, loggedInUser_Id } = req.body;
    //check if user own this restaurant 
    let findAdvert = mysql.format('select id,pic from promo_advert where id = ? and user_id =? ', [advert_id, parseInt(loggedInUser_Id)]);

    return await query_helper.runQuery(findAdvert).then(async resp => {

        if (resp && resp.length > 0) {
            let sql = mysql.format('DELETE FROM promo_advert WHERE id = ?', [advert_id]);
            return await query_helper.runQuery(sql).then(response => {
                if (response && response.affectedRows > 0) {
                    helperFunctions.deleteFile(('public/' + resp[0].pic));
                    return res.send({ status: true, msg: "successfully deleted" })
                }
                else
                    return res.send({ status: false, msg: "something went wrong" })
            });
        } else {
            res.send({ status: false, msg: "You are not authrized" });
        }
    })

}

const getPromoVideo = async function (req, res) {
    let userid = (req.userData.userid) ? parseInt(req.userData.userid) : -1;

    let sql = mysql.format("select promo_video.*,DATE_FORMAT(promo_video.start_date, '%Y-%m-%d') as start_date,DATE_FORMAT(promo_video.end_date, '%Y-%m-%d') as end_date,restaurant.name as restaurant_name from promo_video left join restaurant on promo_video.restaurant_id = restaurant.id where user_id = ? order by promo_video.id desc", [userid]);

    return await query_helper.runQuery(sql).then(response => {

        if (response)
            return res.send({ status: true, msg: "successfully get", adverts: response });
        else
            return res.send({ status: false, msg: "something went wrong" });
    })

}

const addPromoVideo = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let { restaurant_id, distance, start_date, end_date, advertId, delete_video, delete_video_thumb } = req.body;


    let promoVideo = (req.files.video[0]) ? req.files.video[0].path.replace('public/', '') : "";
    let promoVideoThumbnail = (req.files.video_thumbnail[0]) ? req.files.video_thumbnail[0].path.replace('public/', '') : "";

    if (advertId == -1 && !req.files.video[0]) {
        return res.send({ status: false, msg: 'Video not found' });
    }

    //create sql for add and edit diffrent
    if (advertId == -1)
        var sql = mysql.format('insert into promo_video(video,video_thumb,start_date,end_date,restaurant_id,distance,user_id) values (?,?,?,?,?,?,?)', [promoVideo, promoVideoThumbnail, start_date, end_date, restaurant_id, distance, req.userData.userid]);
    else {
        var extraQuery = (promoVideo != "") ? `,video = ${mysql.escape(promoVideo)},video_thumb=${mysql.escape(promoVideoThumbnail)}` : "";
        var sql = `update promo_video set start_date = ${mysql.escape(start_date)},end_date= ${mysql.escape(end_date)} ,distance= ${mysql.escape(distance)}, restaurant_id = ${restaurant_id} ${extraQuery} where id = ${advertId} `;

    }

    var added = false;

    await query_helper.runQuery(sql).then(response => {

        if (response && response.affectedRows > 0) {
            //delete video and video thumb from files
            if (delete_video != "" && promoVideo != "") {

                helperFunctions.deleteFile('public/' + delete_video);
                helperFunctions.deleteFile('public/' + delete_video_thumb);
            }
            added = true;
        }

    });

    if (added) {
        let advertsql = mysql.format("select promo_video.*,DATE_FORMAT(promo_video.start_date, '%Y-%m-%d') as start_date,DATE_FORMAT(promo_video.end_date, '%Y-%m-%d') as end_date,restaurant.name as restaurant_name from promo_video left join restaurant on promo_video.restaurant_id = restaurant.id where user_id = ? order by promo_video.id desc", [req.userData.userid]);

        return await query_helper.runQuery(advertsql).then(resp => {
            if (resp && resp.length > 0) {
                return res.send({ status: true, msg: "successfully added", adverts: resp });
            } else {
                return res.send({ status: false, msg: "something went wrong" });
            }
        })
    } else {
        return res.send({ status: false, msg: "something went wrong" });
    }

}

const getpromovideobyid = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let advertid = (req.body.id) ? req.body.id : -1;
    let userid = (req.userData.userid) ? req.userData.userid : -1;

    let sql = mysql.format('select * from promo_video where id = ? and user_id = ?', [advertid, userid]);
    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", response: response[0] })
        } else {
            return res.send({ status: false, msg: "something went wrong" });
        }
    })
}

const deletePromoVideo = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    let { advert_id, loggedInUser_Id } = req.body;
    //check if user own this restaurant 
    let findAdvert = mysql.format('select id,video_thumb,video from promo_video where id = ? and user_id =? ', [advert_id, parseInt(loggedInUser_Id)]);

    return await query_helper.runQuery(findAdvert).then(async resp => {

        if (resp && resp.length > 0) {
            let sql = mysql.format('DELETE FROM promo_video WHERE id = ?', [advert_id]);
            return await query_helper.runQuery(sql).then(response => {
                if (response && response.affectedRows > 0) {
                    helperFunctions.deleteFile(('public/' + resp[0].video));
                    helperFunctions.deleteFile(('public/' + resp[0].video_thumb));
                    return res.send({ status: true, msg: "successfully deleted" })
                }
                else
                    return res.send({ status: false, msg: "something went wrong" })
            });
        } else {
            res.send({ status: false, msg: "You are not authrized" });
        }
    })

}
const changeadvertstatus = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { id, loggedInUser_Id, status } = req.body;

    let sql = mysql.format('update promo_advert set status = ? where id = ? and user_id = ?', [status, id, loggedInUser_Id]);

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Status update Successfully" });
        else
            return res.send({ status: false, msg: "Something went wrong" });
    })
}

const changepromovideostatus = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { id, loggedInUser_Id, status } = req.body;

    let sql = mysql.format('update promo_video set status = ? where id = ? and user_id = ?', [status, id, loggedInUser_Id]);

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Status update Successfully" });
        else
            return res.send({ status: false, msg: "Something went wrong" });
    })
}

const getreviewsstatus = async function (req, res) {

    if (isNaN(req.query.res_id))
        return res.send({ status: false, msg: "Store Id is invalid" });

    let res_id = req.query.res_id;
    let sqls = [];
    //get avg rating of restaurant
    sqls.push(`select avg(rating) as avgrating,count(restaurant_ratings.id) as totaluser,r.name as res_name from restaurant_ratings left join restaurant as r on r.id = restaurant_ratings.res_id where res_id = ${res_id}`);

    sqls.push(`select count(id) as oneratingcount from restaurant_ratings where res_id = ${res_id} and rating > 0 and rating <= 1 `);
    sqls.push(`select count(id) as tworatingcount from restaurant_ratings where res_id = ${res_id} and rating > 1 and rating <= 2 `);
    sqls.push(`select count(id) as threeratingcount from restaurant_ratings where res_id = ${res_id} and rating > 2 and rating <= 3 `);
    sqls.push(`select count(id) as fourratingcount from restaurant_ratings where res_id = ${res_id} and rating > 3 and rating <= 4 `);
    sqls.push(`select count(id) as fiveratingcount from restaurant_ratings where res_id = ${res_id} and rating > 4 and rating <= 5 `);


    return await query_helper.runMultiQuery(sqls).then(response => {
        //console.log(response)
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "", response });
        } else {
            return res.send({ status: false, msg: "Something went wrong" });
        }
    })
}

const getuserreviews = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { res_id, search, sortby, page, loggedInUser_Id } = req.body;
    let sort = "";
    let limit = 10;
    let offset = (page - 1) * limit;

    if (sortby == 1)
        sort = "rating desc";
    else if (sortby == 2)
        sort = "rating";
    else if (sortby == 3)
        sort = "rr.created_at desc";
    else if (sortby == 4)
        sort = "rr.created_at";
    else
        sort = "rr.created_at desc";


    let sql = `select rr.*,users.name,users.profileimage from restaurant_ratings as rr inner join users on users.id = rr.user_id where rr.res_id = ${res_id} and users.name like ${mysql.escape("%" + search + "%")} order by ${sort} limit ${limit} offset ${offset}`;

    return await query_helper.runQuery(sql).then(response => {

        return res.send({ status: true, msg: "", response });
    });
}

const getgalleryImages = async function (req, res) {
    if (isNaN(req.query.res_id))
        return res.send({ status: false, msg: "Store Id is invalid" });
    let res_id = req.query.res_id;

    //get restaurant gallery images
    let sql = `select id,image from restaurant_gallery where res_id = ${mysql.escape(res_id)}`;
    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: 'successfully get', response });
        else
            return res.send({ status: false, msg: 'something went wrong', response: [] });
    })

}
const galleryImages = async function (req, res) {

    if (isNaN(req.query.res_id))
        return res.send({ status: false, msg: "Store Id is invalid" });

    let res_id = req.query.res_id;
    uploadedFiles = [];

    let sql = "insert into restaurant_gallery(res_id,image) values"

    await helperFunctions.sharpFile(req.files, 1200, 800).then(async response => {
        if (response && response.length > 0) {
            response.map((item, index) => {
                sql += `(${res_id},'${item}')`;
                if (response.length - 1 != index)
                    sql += ',';
            })
            return await query_helper.runQuery(sql).then(async resp => {
                if (resp && resp.affectedRows > 0) {
                    //get all gallery images after save
                    let getgalleryimagesql = `select id,image from restaurant_gallery where res_id = ${mysql.escape(res_id)}`;
                    return await query_helper.runQuery(getgalleryimagesql).then(response2 => {
                        if (response2 && response2.length > 0) {
                            return res.send({ status: true, msg: "Successfully Uploaded", data: response2 });
                        } else {
                            return res.send({ status: true, msg: "Successfully Uploaded", data: {} });
                        }
                    })

                }
                else
                    return res.send({ status: false, msg: "Something went wrong" });
            })
        } else {
            return res.send({ status: false, msg: "Something went wrong" });
        }
    });
}

const deletegallaryImage = async function (req, res) {
    if (isNaN(req.query.res_id))
        return res.send({ status: false, msg: "store Id is invalid" });
    if (isNaN(req.query.id))
        return res.send({ status: false, msg: "Gallery Image Id is invalid" });

    let img_path = req.query.img_path ? req.query.img_path : "";

    let sql = mysql.format('delete from restaurant_gallery where id = ? and res_id = ?', [req.query.id, req.query.res_id]);

    return await query_helper.runQuery(sql).then(resp => {

        if (resp && resp.affectedRows > 0) {
            helperFunctions.deleteFile('public/' + img_path);
            return res.send({ status: true, msg: "Gallery Image deleted successfully" });

        }
        else
            return res.send({ status: false, msg: "Something went wrong" });
    })
}

const saveCustomizations = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { group_id, name, options, customize_id } = req.body;

    if (customize_id == null) {
        //save customization
        let savesql = mysql.format('insert into customization (group_id , 	name , 	type) values(?,?,?)', [group_id, name, 1]);

        return await query_helper.runQuery(savesql).then(async response => {
            if (response && response.insertId > 0) {
                //save options of customizations
                let sql = 'insert into customize_items(customization_id,option_name,option_price) values ';
                let SqlParts = [];
                options.forEach(ele => {
                    SqlParts.push(`(${response.insertId},${mysql.escape(ele.option_name)},${mysql.escape(ele.option_price)})`)
                })
                sql += SqlParts.join();

                let getallc = `select * from customization where group_id = ${group_id}`
                return await query_helper.runMultiQuery([sql, getallc]).then(resp => {
                    if (resp && resp.length > 0) {
                        res.send({ status: true, msg: "successfully inserted", cus: resp[1] });
                    } else {
                        res.send({ status: false, msg: "something went wrong" });
                    }
                })
            } else {
                res.send({ status: false, msg: "something went wrong" })
            }
        })
    }

    if (customize_id != null && customize_id > 0) {
        let updateSql = mysql.format('update customization set group_id = ? , name = ? ,type = ? where id = ?', [group_id, name, 1, customize_id]);

        return await query_helper.runQuery(updateSql).then(async response => {
            if (response && response.affectedRows > 0) {
                //if item id found than update otherwise add new

                // let sql = 'insert into customize_items(customization_id,option_name,option_price) values ';
                // let SqlParts = [];
                // let QuerySqls = []
                // options.forEach(ele => {
                //     if (ele.itemid != null && ele.itemid > 0)
                //         QuerySqls.push(`update customize_items set option_name = ${mysql.escape(ele.option_name)} , option_price =${mysql.escape(ele.option_price)} where id = ${mysql.escape(ele.itemid)} `)
                //     else
                //         SqlParts.push(`(${customize_id},${mysql.escape(ele.option_name)},${mysql.escape(ele.option_price)})`)
                // })
                // sql += SqlParts.join();

                // if (SqlParts.length > 0)
                //     QuerySqls.push(sql)
                // return await query_helper.runMultiQuery(QuerySqls).then(resp => {
                //   ;
                //     if (resp) {
                //         res.send({ status: true, msg: "successfully inserted" });
                //     } else {
                //         res.send({ status: false, msg: "something went wrong" });
                //     }
                // })


                let deletesql = `delete from customize_items where customization_id = ${customize_id}`
                let sql = 'insert into customize_items(customization_id,option_name,option_price) values ';
                let SqlParts = [];
                options.forEach(ele => {
                    SqlParts.push(`(${customize_id},${mysql.escape(ele.option_name)},${mysql.escape(ele.option_price)})`)
                })
                sql += SqlParts.join();

                let getallc = `select * from customization where group_id = ${group_id}`
                return await query_helper.runMultiQuery([deletesql, sql, getallc]).then(resp => {
                    ;
                    if (resp) {
                        res.send({ status: true, msg: "successfully inserted", cus: resp[2] });
                    } else {
                        res.send({ status: false, msg: "something went wrong" });
                    }
                })




            }
        })
    }
}


const addResSlot = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { date, res_id, options } = req.body

    if (options.length < 1)
        return res.send({ status: false, msg: 'nothing to update' });

    let temp = []
    options.forEach(ele => {
        if (ele.id == null)
            temp.push(`(${res_id},'${date}',${mysql.escape(ele.from_timeslot)},${mysql.escape(ele.to_timeslot)})`)
    })

    if (temp.length > 0) {
        let sql = `insert into res_delivery_slot(res_id,date,from_timeslot,to_timeslot) values ${temp.join()}`;
        //console.log(sql)
        return await query_helper.runQuery(sql).then(response => {
            //console.log(response)
            if (response && response.affectedRows > 0) {
                return res.send({ status: true, msg: 'Successfully update' })
            } else {
                return res.send({ status: false, msg: "Something went wrong" })
            }
        })
    }

    return res.send({ status: true, msg: 'Successfully update' })


}

const getResSlot = async function (req, res) {
    let { date, loggedInUser_Id, res_id } = req.body;

    let sql = `select * from res_delivery_slot where date = '${date}' and res_id = ${res_id} order by from_timeslot`;
    let sql1 = `select DISTINCT date from res_delivery_slot where res_id = ${res_id} order by date `;

    return await query_helper.runMultiQuery([sql, sql1]).then(response => {
        //console.log("getRestSlot: ", response)
        if (response) {
            return res.send({ status: true, data: response[0], allData: response[1] })
        } else {
            return res.send({ status: false, msg: "Something went wrong" })
        }
    })
}

const getResTimeSlots = async function (req, res) {
    let res_id = req.body.res_id ? req.body.res_id : -1;

    let sql = `select TIME_FORMAT(from_timeslot,'%H:%i') as from_timeslot,TIME_FORMAT(to_timeslot,'%H:%i') as to_timeslot,DATE_FORMAT(date,'%Y-%m-%d')  as start  from res_delivery_slot where date >= CURDATE() and res_id = ${mysql.escape(res_id)}`
    //console.log(sql)
    return await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.length > 0) {
            return res.send({ status: true, msg: 'Successfully get', data: response })
        } else {
            return res.send({ status: false, msg: 'Something went wrong', data: {} })
        }
    })
}

function deletemenuSQL(res_id) {
    //delete all menu,menu_item,customization, customization_item

    delsql1 = `delete  from menugroupitem where group_id in (select id from menugroup where restaurant_id = ${mysql.escape(res_id)})`;

    delsql2 = `delete from customize_items where customization_id in ( select id from customization where group_id in (select id from menugroup where restaurant_id = ${mysql.escape(res_id)}))`

    delsql3 = `delete from customization where group_id in (select id from menugroup where restaurant_id = ${mysql.escape(res_id)})`;
    delsql4 = `delete from menugroup where restaurant_id = ${mysql.escape(res_id)}`;

    return [delsql1, delsql2, delsql3, delsql4]
}
const deleteAllmenu = async function (req, res) {
    let { res_id } = req.body;

    return await query_helper.runMultiQuery(deletemenuSQL(res_id)).then(async response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: 'Successfully deleted', data: response })
        } else {
            return res.send({ status: false, msg: 'Something went wrong', data: {} })
        }
    });
}
const usemenu = async function (req, res) {
    let { res_id, use_res_id } = req.body;

    return await query_helper.runMultiQuery(deletemenuSQL(res_id)).then(async response => {
        //now get group ,item ,customization,customizationitem

        getgroupSql = `select * from menugroup where restaurant_id = ${mysql.escape(use_res_id)}`;

        return await query_helper.runQuery(getgroupSql).then(async resp => {

            //select if any menu group available
            if (resp.length < 1) {
                return res.send({ status: true, msg: 'menu is updated' })
            } else {
                let sqlParts = [];
                resp.forEach(e => {
                    sqlParts.push(`(${res_id},'${e.group_name}',${mysql.escape(e.categories)})`)
                })

                let insergroupSql = `insert into menugroup (restaurant_id,group_name,categories) values ${sqlParts.join()}`;

                return await query_helper.runQuery(insergroupSql).then(async resp1 => {
                    if (resp1 && resp1.affectedRows > 0) {
                        //update after group insert
                        if (resp.length == resp1.affectedRows) {
                            let tempArrForGroup = [];
                            let used_menu_id = [];

                            resp.forEach((e, i) => {
                                //console.log(e, i)
                                used_menu_id.push(e.id)
                                tempArrForGroup.push({ 'old_id': e.id, 'new_id': resp1.insertId + i })

                            })

                            //select item ,customization,customizationitem based on group  and insert into new menu
                            let selectCusSql = `select * from customization where group_id in (${used_menu_id.join()})`;
                            let selectitemSql = `select * from menugroupitem where group_id in (${used_menu_id.join()})`;
                            let selectcusitemSql = `select * from customize_items where customization_id in (select id from customization where group_id in (${used_menu_id.join()}))`

                            return await query_helper.runMultiQuery([selectCusSql, selectitemSql, selectcusitemSql]).then(async resp3 => {

                                if (resp3) {
                                    let cusidsarr = []
                                    //udpate customization
                                    if (resp3[0].length > 0) {
                                        let sqlp = [];
                                        resp3[0].forEach(e => {
                                            sqlp.push(`(${getNewId(e.group_id, tempArrForGroup)},'${e.name}','${e.type}')`);
                                        })
                                        let cusSql = `insert into customization (group_id,name,type) values ${sqlp.join()}`;

                                        await query_helper.runQuery(cusSql).then(async r => {
                                            if (r && r.affectedRows > 0) {
                                                resp3[0].forEach((e, i) => {
                                                    cusidsarr.push({ 'old_id': e.id, 'new_id': r.insertId + i })
                                                })
                                                // //console.log('cust resp')
                                                // //console.log(r)

                                                let CusItemparts = [];
                                                //console.log(resp3[2])
                                                resp3[2].forEach(e => {
                                                    //console.log(getNewId(e.customization_id, cusidsarr))
                                                    CusItemparts.push(`(${getNewId(e.customization_id, cusidsarr)},'${e.option_name}',${e.option_price})`)
                                                })
                                                let cusitesql = `insert into customize_items(customization_id,option_name,option_price) values ${CusItemparts.join()}`;
                                                //console.log(cusitesql)
                                                await query_helper.runQuery(cusitesql).then(resspp => {

                                                })
                                            } else {
                                                return res.send({ status: false, msg: 'Something went wrong' })
                                            }
                                        });
                                    }

                                    //update menu item
                                    if (resp3[1].length > 0) {
                                        let sqlp = [];
                                        resp3[1].forEach(e => {
                                            sqlp.push(`(${getNewId(e.group_id, tempArrForGroup)},${mysql.escape(e.item_name)},${e.item_price},${e.item_quantity},'${e.item_pic}',${mysql.escape(getNewCusValues(e.customizations, cusidsarr))},${e.city_tax},${e.state_tax},'${e.upc_no}',${mysql.escape(e.item_des)},${mysql.escape(e.item_cat)},${e.custom_qua})`);
                                        })
                                        await query_helper.runQuery(`insert into menugroupitem (group_id,item_name,item_price,item_quantity,item_pic,customizations,city_tax,state_tax,upc_no,item_des,item_cat,custom_qua) values ${sqlp.join()}`).then(r => {
                                            //console.log(r)
                                            if (r && r.insertId > 0) {
                                                return res.send({ status: true, msg: 'successfully Updated' })
                                            } else {
                                                return res.send({ status: false, msg: 'Something went wrong' })
                                            }
                                        });
                                    } else {
                                        return res.send({ status: false, msg: 'Something went wrong' })
                                    }
                                } else {
                                    return res.send({ status: false, msg: 'Something went wrong' })
                                }

                            })
                        } else {
                            return res.send({ status: false, msg: 'Something went wrong' })
                        }
                    } else {
                        return res.send({ status: false, msg: 'Something went wrong' })
                    }
                })
            }

        })


    })


}

function getNewCusValues(ids, arr) {
    let t = [];
    if (ids != null && ids.split(',').length > 0) {
        ids.split(',').forEach(e => {
            arr.forEach(ne => {
                if (e == ne.old_id) {
                    t.push(ne.new_id);
                }
            })
        })
    }
    return t.join()
}
function getNewId(id, arr) {
    let new_id = -1;
    arr.forEach(e => {
        if (e.old_id == id)
            new_id = e.new_id
    })
    return new_id
}

const updateCookingTime = async function (req, res) {
    let { order_id, cookt } = req.body;

    let sql = mysql.format('update orders set cooking_time = ? where id = ?', [cookt, order_id]);

    await query_helper.runQuery(sql).then(async response => {
        if (response && response.affectedRows > 0) {
            //send notification to user and driver
            //get device_token
            //console.log([`select device_token,platform from users where id = (select user_id from orders where id=${order_id} )`, `select device_token,platform from users where id = (select user_id from driver_orders where order_id = ${order_id} limit =1 )`])
            await query_helper.runMultiQuery([`select device_token,platform from users where id = (select user_id from orders where id=${order_id} )`, `select device_token,platform from users where id = (select user_id from driver_orders where order_id = ${order_id} limit 1 )`]).then(respp => {
                //console.log(respp)
                if (respp) {
                    if (respp[0][0] && respp[0][0].device_token && respp[0][0].platform)
                        pushnotification.send_push(respp[0][0].device_token, respp[0][0].platform, 'Food preperation time', `Your order ${order_id} start preparing . It will take ${cookt} min`, 'pickup_request', '', '');
                    if (respp[1][0] && respp[1][0].device_token && respp[1][0].platform)
                        driver_notification.send_push(respp[1][0].device_token, respp[1][0].platform, 'Food preperation time', `Your order ${order_id} start preparing . It will take ${cookt} min`, 'pickup_request', '', '');
                }
                return res.send({ status: true, msg: 'Successfully updated' })

            })
        } else
            return res.send({ status: false, msg: "something went wrong" })
    })
}

function getCategories(data, key) {
    let t = [];
    data.forEach(e => {
        if (e[3] == key && !t.includes(e[4]))
            t.push(e[4])
    })

    return t.join();
}

const uploadmenuExcel = async function (req, res) {

    if (!req.body.res_id || req.body.res_id == null)
        return res.send({ status: false, msg: 'Store not found' })


    let menudata = req.body.result ? req.body.result : []


    // //delete Excel file now
    // helperFunctions.deleteFile(req.file.path);

    if (menudata.length > 0) {
        groups = [];
        //create insert sqls
        menudata.forEach(e => {
            if (!groups.includes(e[3]) && typeof e[3] == 'string')
                groups.push(e[3])
        })



        groupSqlParts = []
        for (const e of groups) {
            groupSqlParts.push(`(${req.body.res_id},${mysql.escape(e)},${mysql.escape(getCategories(menudata, e))})`)
        }

        //insert groups
        let groupSql = `insert menugroup(restaurant_id,group_name,categories) values ${groupSqlParts.join()}`;

        await query_helper.runQuery(groupSql).then(async r => {
            //assign inseredid to 
            let groupIds = []
            groups.forEach((e, i) => {
                groupIds.push({ group: e, id: r.insertId + i })
            })

            let menuItemSqlParts = [];

            menudata.forEach(e => {
                let price = (e[7]) ? e[7].toString().replace('$', '').trim() : 0;
                let item_quantity = (e[8]) ? parseInt(e[8]) : null
                menuItemSqlParts.push(`(${mysql.escape(e[0])},${mysql.escape(e[1])},${mysql.escape(e[2])},${getGroupId(e[3], groupIds)},${mysql.escape(e[4])},${mysql.escape(e[5])},${mysql.escape(e[6])},${price},${item_quantity} )`)
            })

            await query_helper.runQuery(`insert menugroupitem(upc_no,item_name,item_des,group_id,item_cat,city_tax,state_tax,item_price,item_quantity) values ${menuItemSqlParts.join()}`).then(response => {
                //console.log(response)
                if (response && response.insertId > 0) {
                    return res.send({ status: true, msg: "Successfully updated" })
                } else {
                    return res.send({ status: false, msg: "something went wrong" })
                }
            })

        })
    } else {
        return res.send({ status: false, msg: "Check excel file it should be microsoft XLSX format" })
    }

}

const updatemenuItems = async function (req, res) {
    if (!req.body.res_id || req.body.res_id == null)
        return res.send({ status: false, msg: 'Store not found' })

    let data = req.body.items ? req.body.items : []

    if (data.length > 0) {
        sqlParts = ''
        priceSqlParts = ''
        data.forEach(e => {
            if (e['id']) {
                if (e['quantity'] && e['quantity'] != '') {
                    sqlParts += `when id = ${mysql.escape(e['id'])} then ${mysql.escape(e['quantity'])} `
                }
                if (e['price'] && e['price'] != '') {
                    let price = e['price'].toString().replace('$', '').trim();
                    priceSqlParts += `when id = ${mysql.escape(e['id'])} then ${mysql.escape(price)} `
                }
            }
        })
        let sqlpart2 = (priceSqlParts != '') ? `,item_price= (case ${priceSqlParts} else item_price end)` : ''

        let sql = `update menugroupitem set item_quantity = ( case ${sqlParts} else item_quantity end ) ${sqlpart2}  where group_id in (select id from menugroup where restaurant_id = ${req.body.res_id}) `

        await query_helper.runQuery(sql).then(re => {

            if (re && re.affectedRows > 0) {
                return res.send({ status: true, msg: "Successfully updated" })
            } else {
                return res.send({ status: false, msg: "something went wrong" })
            }
        })
    } else {
        return res.send({ status: false, msg: "Check excel file it should be microsoft XLSX format" })
    }

}

const uploadinvQua = async function (req, res) {
    if (!req.body.res_id || req.body.res_id == null)
        return res.send({ status: false, msg: 'Store not found' })

    let data = req.body.result ? req.body.result : []

    if (data.length > 0) {
        sqlParts = ''
        priceSqlParts = ''
        data.forEach(e => {
            if (e[0]) {
                if (e[1] && e[1] != '') {
                    sqlParts += `when upc_no = ${mysql.escape(e[0])} then ${mysql.escape(e[1])} `
                }
                if (e[2] && e[2] != '') {
                    let price = e[2].toString().replace('$', '').trim();
                    priceSqlParts += `when upc_no = ${mysql.escape(e[0])} then ${mysql.escape(price)} `
                }
            }
        })
        let sqlpart2 = (priceSqlParts != '') ? `,item_price= (case ${priceSqlParts} else item_price end)` : ''

        let sql = `update menugroupitem set item_quantity = ( case ${sqlParts} else item_quantity end ) ${sqlpart2}  where group_id in (select id from menugroup where restaurant_id = ${req.body.res_id}) `

        await query_helper.runQuery(sql).then(re => {

            if (re && re.affectedRows > 0) {
                return res.send({ status: true, msg: "Successfully updated" })
            } else {
                return res.send({ status: false, msg: "something went wrong" })
            }
        })
    } else {
        return res.send({ status: false, msg: "Check excel file it should be microsoft XLSX format" })
    }

}

function getGroupId(group, groupIds) {
    let group_id = -1;
    groupIds.forEach(e => {
        if (e.group == group)
            group_id = e.id
    })
    return group_id;
}
//Excel filePath="D:\\DataFiles\\SampleExcel.xlsx"
async function readExcelFile(filePath) {
    var Excel = require("exceljs");
    var workbook = new Excel.Workbook();
    let data = [];
    //Use then function to executed code that need to perform immediately after readFile
    await workbook.xlsx.readFile(filePath).then(function (result) {
        //console.log(result)
        //Use sheetName in getWorksheet function
        var worksheet = workbook.getWorksheet();
        //Use nested iterator to read cell in rows 
        //First iterator for rows in sheet
        //console.log(worksheet)

        worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
            // //console.log("Current Row:" + rowNumber);
            let item = []
            //Second iterator for cells in row
            row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
                //print row number, column number and cell value at[row][col]
                // //console.log("Cell Value=" + cell.value + " for cell [" + rowNumber + "]" + "[" + colNumber + "]");
                /*
                    write code
                */
                //  //console.log(cell.value)
                item.push(cell.value)
            });

            data.push(item);
        });

    });
    if (data.length > 1)
        data.shift()

    return data;
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
    let orderid = req.body.orderid ? req.body.orderid : -1
    let loggedInuser = req.userData.userid;
    let role = req.body.userRole

    let notallow = false;
    //...chcek if user is admin as said
    if (role == 'admin') {
        //check if logged In user is admin
        await query_helper.runQuery(`select role from users where id = ${mysql.escape(loggedInuser)} and status = 1`).then(resp => {
            if (resp && resp[0] && resp[0].role == 'admin')
                notallow = false;
            else
                notallow = true;

            if (notallow)
                return res.send({ status: false, msg: "you are not admin", data: {} });
        })
    } else if (role == 'editor') {
        //get editor owner_id 
        await query_helper.runQuery(`select owner_id from editors where id = ${mysql.escape(loggedInuser)} and status = 1`).then(resp => {
            if (resp && resp.length > 0)
                loggedInuser = resp[0].owner_id
            else
                loggedInuser = -1
        })
    } else if (role == 'owner') {
        notallow = false;
    } else {
        return res.send({ status: false, msg: "You are not allowed here", data: {} });
    }

    if (notallow)
        return res.send({ status: false, msg: "order not found", data: {} });


    if (role == 'owner' || role == 'editor') {
        //check if order related to loggedin restaurant owner
        let allow = false;

        await query_helper.runQuery(`select o.id from orders as o left join restaurant as r on r.id = o.res_id  where o.id = ${orderid} and r.created_by = ${loggedInuser} `).then(response => {
            //console.log(response)
            if (response && response.length > 0)
                allow = true;
        })
        if (!allow)
            return res.send({ status: false, msg: "Something went wrong" })
    }



    let sql = `update orders set payment_status = 1 where id = ${orderid} `

    await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.affectedRows > 0) {
            return res.send({ status: true, msg: "Payment status change" })
        } else {
            return res.send({ status: false, msg: "Something went wrong" })
        }
    })
}

const stopSearching = async function (req, res) {
    let { loggedInUser_Id, orderid } = req.body;

    //check if order can be modify by this user

    let sql = mysql.format('select o.id,r.name as resname,u.name as uname,pref_lang,u.email as uemail,device_token,platform from orders as o left join restaurant as r on r.id = o.res_id left join users as u on u.id = o.user_id where o.id = ? and (r.created_by = ? or (select role FROM users where id = ?) = "admin")', [orderid, loggedInUser_Id, loggedInUser_Id]);


    await query_helper.runQuery(sql).then(async response => {
        if (response && response.length > 0) {
            //stop searching 
            //remove from pickup request and driver_orders
            let delpickupsql = `delete from pickup_request where order_id = ${orderid}`;
            let deldriver_order = `delete from driver_orders where order_id = ${orderid}`;
            let updateordersql = `update orders set delivered_by = 'owner' where id = ${orderid}`

            await query_helper.runMultiQuery([delpickupsql, deldriver_order, updateordersql]).then(r => {
                //console.log(r)
                return res.send({ status: true, msg: "Successfully stop" })
            })
        } else {
            res.send({ status: false, msg: "you are not authorize" })
        }
    })
}

const getneworders = async function (params) {
    try {
        let data = JSON.parse(params)

        //console.log(data.token, config.jwt.encryption);

        const decode = jwt.verify(data.token, config.jwt.encryption);

        //console.log(decode);
        if (data.user_id && decode.userid == data.user_id) {
            //here means auth successfully and update user location

            let sql = '';

            if (data.role && data.role == 'editor') {
                sql = mysql.format('select o.id from orders as o left join restaurant as r on r.id = o.res_id where r.id in (select res_id from editors where id = ?) and o.created_date > DATE_SUB(NOW(),INTERVAL 30 SECOND) limit 1', [data.user_id])

            } else {
                sql = mysql.format('select o.id from orders as o left join restaurant as r on r.id = o.res_id where r.created_by = ? and o.created_date > DATE_SUB(NOW(),INTERVAL 30 SECOND) limit 1', [data.user_id])
            }
            //console.log(sql)
            return await query_helper.runQuery(sql).then(response => {
                //console.log(response)
                if (response && response.length > 0) {
                    console.log('\x1b[33m%s\x1b[0m', 'Websocket Successfully get')
                    return {
                        status: true,
                        message: "Successfully get",
                        data: response[0].id
                    };
                } else {
                    console.log('\x1b[33m%s\x1b[0m', 'Websocket No new order')
                    return {
                        status: false,
                        message: "No new order"
                    };
                }
            })

        } else {
            console.log('\x1b[33m%s\x1b[0m', 'Websocket Auth failed invalid user')
            return {
                status: false,
                message: "Auth failed"
            };
        }
    } catch (error) {
        //console.log(error)
        console.log('\x1b[33m%s\x1b[0m', 'Websocket Auth failed invalid Token')
        return {
            status: false,
            message: "Auth failed"
        };
    }
}

const saveDiscount = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { percentage, moa, mpd, dis_condition, res_id, user_type } = req.body
    let discount_id = req.body.discount_id ? req.body.discount_id : -1

    if (discount_id != -1)
        var sql = mysql.format('update discounts set percentage = ?, moa = ?, mpd = ?, dis_condition = ?, user_type = ? where id = ?', [percentage, moa, mpd, dis_condition, user_type, discount_id])
    else
        var sql = mysql.format('insert into discounts(percentage, moa, mpd, dis_condition, res_id,user_type) values (?,?,?,?,?,?)', [percentage, moa, mpd, dis_condition, res_id, user_type]);

    //console.log(sql)
    await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: 'successfully Inserted' })
        else
            return res.send({ status: false, msg: "something went wrong" })
    })
}

const getResDiscount = async function (req, res) {
    let res_id = req.body.res_id ? req.body.res_id : -1;

    let sql = mysql.format('select * from discounts where res_id = ?', [res_id])

    await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: 'successfully get', data: response })
        else
            return res.send({ status: false, msg: "something went wrong", data: [] })
    })
}

const deldiscount = async function (req, res) {
    let discount_id = req.body.discount_id ? req.body.discount_id : -1;

    let sql = `delete from discounts where id = ${mysql.escape(discount_id)}`;

    return await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: 'successfully deleted' })
        else
            return res.send({ status: false, msg: "something went wrong" })
    })
}

const checkallowtoeditdiscount = async function (req, res) {
    let res_id = req.body.res_id ? req.body.res_id : -1;
    let loggedInUser_Id = req.body.loggedInUser_Id ? req.body.loggedInUser_Id : -1;

    //run sql to check
    let sql = `select id from restaurant where id = ${res_id} and created_by = ${loggedInUser_Id} and can_edit_discount =1`;

    await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: 'successfully can edit' })
        } else {
            return res.send({ status: false, msg: "not allow" })
        }
    })
}

const submitCat = async function (req, res) {
    let groupId = req.body.group_id ? req.body.group_id : -1;
    let catArray = req.body.catArray ? req.body.catArray : []

    if (catArray.length < 1)
        return res.send({ status: false, msg: "No category found" })

    await query_helper.runQuery(`update menugroup set categories = ${mysql.escape(catArray.join())} where id = ${mysql.escape(groupId)}`).then(respp => {
        if (respp && respp.affectedRows > 0)
            return res.send({ status: true, msg: 'Successfully updates' });
        else
            return res.send({ status: false, msg: 'something went wrong' })
    });
}

const updateOrder = async function (req, res) {
    let { cart } = req.body;
    let userID = req.userData.userid;
    let role = cart.role;

    notallow = false;
    if (role == 'editor') {
        await query_helper.runQuery(`select res_id from editors where id = ${mysql.escape(userID)} and status = 1`).then(resp => {
            if (resp && resp[0] && resp[0].res_id == cart.res_id)
                notallow = false;
            else
                notallow = true;
        })

        if (notallow)
            return res.send({ status: false, msg: "you are not allow to access this store", data: {} });
    }

    //console.log(cart)
    //console.log(JSON.stringify(cart.cart))
    sql = `update orders set cart = ${mysql.escape(JSON.stringify(cart.cart))} , city_tax=${mysql.escape(cart.city_tax)}, state_tax=${mysql.escape(cart.state_tax)},without_discount = ${mysql.escape(cart.without_discount)}, total=${mysql.escape(cart.total)},discount=${mysql.escape(cart.discount)} ,modified_order=0 , modified_date= NOW() where id = ${cart.order_id}`;

    //console.log(sql)
    await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: 'Successfully updates' });
        else
            return res.send({ status: false, msg: 'something went wrong' })
    })

}

const saveEditor = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { name, email, password, confirmPassword, res_id, status, editorId } = req.body;
    let user_id = req.userData.userid;

    if (password && confirmPassword && password != confirmPassword)
        return res.send({ status: false, msg: 'password not matched' })

    //console.log('here')
    bcrypt.hash(password, CONFIG.bcrypt.saltRounds, async function (err, hash) {

        //console.log(hash)
        if (editorId == -1) {

            editorAvailable = false;
            //check if already user assign to other restaurant
            await query_helper.runQuery(`select * from editors where email = ${mysql.escape(email)}`).then(resp => {
                if (resp && resp.length > 0)
                    editorAvailable = true;
            })

            if (editorAvailable)
                return res.send({ status: false, msg: 'Editor with email already assign to another store' })

            var sql = `INSERT INTO editors (name,email,password,res_id,status,owner_id) VALUES (${mysql.escape(name)},${mysql.escape(email)},${mysql.escape(hash)},${mysql.escape(res_id)},${mysql.escape(status)},'${mysql.escape(user_id)}')`;

        } else {
            //console.log('eneter edit')
            let extraQuery = (password && password.trim() != '') ? `,password='${hash}'` : ''

            var sql = `update editors set name=${mysql.escape(name)} ,email= ${mysql.escape(email)},res_id=${mysql.escape(res_id)},status=${mysql.escape(status)}${extraQuery} where id = ${mysql.escape(editorId)} and owner_id=${user_id}`;
            //console.log(sql)
        }

        return await query_helper.runQuery(sql).then(response => {
            if (response && response.affectedRows > 0)
                return res.send({ status: true, msg: 'Successfully inserted' });
            else
                return res.send({ status: false, msg: 'something went wrong' })
        })
    })
}

const getEditors = async function (req, res) {
    let User_Id = req.query.loggedInUser_Id

    //get editors of this user
    let sql = `select e.*,r.name as res_name from editors as e left join restaurant as r on r.id = e.res_id where e.owner_id = ${mysql.escape(User_Id)}`;

    return await query_helper.runQuery(sql).then(response => {
        //console.log(response)
        if (response && response.length > 0)
            return res.send({ status: true, msg: 'Successfully get', editors: response });
        else
            return res.send({ status: false, msg: 'something went wrong', editors: [] })
    })
}

const deleteEditor = async function (req, res) {
    let id = req.query.id ? req.query.id : -1
    let user_Id = req.query.loggedInUser_Id

    let sql = `delete from editors where id = ${id} and owner_id = ${user_Id}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: 'Successfully deleted' });
        else
            return res.send({ status: false, msg: 'something went wrong' })
    })
}

const getInvoiceImage = async function (req, res) {

    let index = req.query.index;
    let file

    if (fs.existsSync('public/invoiceimage/' + 'image' + index + '.jpg')) {
        //console.log("jpg")
        file = fs.readFileSync('public/invoiceimage/' + 'image' + index + '.jpg');
    } else if (fs.existsSync('public/invoiceimage/' + 'image' + index + '.png')) {
        //console.log("png exist")
        file = fs.readFileSync('public/invoiceimage/' + 'image' + index + '.png')
    }

    return res.send({ status: true, msg: 'successfully get', file });

}

module.exports = {
    getrestaurant, getrestaurantlist, saveRestaurant, updateRestaurant, getcategories, changerestaurantStatus, getsubcategory,
    getrestaurantgroups,
    creategroup,
    getmenuGroup,
    deleteGroup,
    deleteRestaurant,
    addPromoAdvert,
    getuserrestaurants,
    getPromoAdvert,
    getadvertById, deleteAdvert, saveEditor, deleteEditor,
    addPromoVideo, getPromoVideo, getpromovideobyid, deletePromoVideo, changeadvertstatus, changepromovideostatus,
    getuserreviews, getreviewsstatus, galleryImages, getgalleryImages, getInvoiceImage, deletegallaryImage, getGroupCustomization, saveCustomizations,
    getCustomizationDetail, deleteCustomization, getResTimeSlots, addResSlot, getResSlot, usemenu, updateCookingTime, uploadmenuExcel, deleteAllmenu, verifyUserCode, updatePaymentStatus, stopSearching, uploadinvQua, getneworders, saveDiscount, getResDiscount, deldiscount, checkallowtoeditdiscount, submitCat, updateOrder, getEditors, updatemenuItems
};
