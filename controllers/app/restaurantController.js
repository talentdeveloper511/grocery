const authService = require("../../services/AuthService");
var mysql = require("mysql");
var bcrypt = require("bcrypt");
var query_helper = require("../../helpers/database_helper");
var jwt = require("jsonwebtoken");
var config = require("../../config/config");
var fieldvalidator = require("../../middleware/validator");
var { validationResult } = require("express-validator/check");
var mail_helper = require("../../helpers/mailer_helper");
var resService = require("../../services/app/restaurantService");
const stripe = require('stripe')(config.stripeAccountKey);
var pushnotification = require("./../../helpers/notification");
var driver_notification = require("./../../helpers/driver_notification")
const { response } = require("express");

let openclosefields = 'monopen_time,monclose_time,tueopen_time,tueclose_time,wedopen_time,wedclose_time,thuopen_time,thuclose_time,friopen_time,	friclose_time,satopen_time,satclose_time,sunopen_time,sunclose_time';

const rateRestaurant = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let { user_id, res_id, waiting, restrooms, ambience, service, food, pricing, management, locality, comment } = req.body;
    let overallRating = ((waiting + restrooms + ambience + service + food + pricing + management + locality) / 8).toFixed(1);

    //check if user already given rating
    let sql = mysql.format("SELECT id FROM restaurant_ratings where user_id = ? and res_id = ?", [user_id, res_id]);
    return await query_helper.runQuery(sql).then(async (response) => {

        if (response.length > 0)
            //save rating in database
            sql1 = mysql.format("UPDATE restaurant_ratings SET rating= ?,waiting= ?, restrooms= ?, ambience= ?, service= ?, food= ?, pricing= ?, management= ?, locality= ?,comment=? WHERE user_id = ? AND res_id =? ", [overallRating, waiting, restrooms, ambience, service, food, pricing, management, locality, comment, user_id, res_id]);
        else
            sql1 = mysql.format("INSERT INTO restaurant_ratings (user_id,res_id,rating,waiting, restrooms, ambience, service, food, pricing, management, locality,comment) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", [user_id, res_id, overallRating,
                waiting, restrooms, ambience, service, food, pricing, management, locality, comment]);


        let reviewsql = mysql.format('select restaurant_ratings.*,comment,users.name as user_name,profileimage from restaurant_ratings left join users on  restaurant_ratings.user_id = users.id where res_id = ?  and users.status = 1 order by created_at desc limit 10', res_id);

        await query_helper.runMultiQuery([sql1, reviewsql]).then(resp => {

            if (resp[0].affectedRows > 0)
                return res.send({ status: true, msg: "Inserted Successfully", data: resp[1] })
            else
                return res.send({ status: false, msg: "Something went wrong", data: {} })
        })

    });
};

const homepageRestaurant = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;
    lat = req.body.latitude;
    lng = req.body.longitude;

    await resService.getnearestpopularRestaurant(lat, lng).then(async (response) => {
        mostpopular = response;
        //get newest restaurant 
        await resService.getnewestRestaurant(lat, lng).then(resp => {
            newestRestaurant = resp;
        })
    });

    await resService.getbannerRestaurant(lat, lng).then(response => {
        bannerRestaurant = response;
    })

    6
    return res.send({ status: true, data: { mostpopular, newestRestaurant, bannerRestaurant } })
}

const restaurantDetail = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;
    //get restaurant Id 
    let resId = req.body.res_id;
    let user_id = req.body.user_id;

    let lat = 22.7027304;
    let lng = 75.9203209;

    let detailsql = mysql.format(`select min_order_value,max_order_value,restaurant.status,restaurant.id,claimed,restaurant.name as restaurant_name,avg_cost,cat1.name as category_name,contact,restaurant.description,description_es,subcategory,GROUP_CONCAT(cat2.name) as subcat_name,restaurantpic,city,address,latitude,longitude ,   3956 * 2 * ASIN(SQRT(POWER(SIN((${lat} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${lat} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${lng} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance    ,(select avg(rating)  from restaurant_ratings  where res_id = ?) as rating from restaurant left join category as cat1 on restaurant.category = cat1.id left join category as cat2 on FIND_IN_SET(cat2.id, restaurant.subcategory) where restaurant.id = ?`, [resId, resId]);

    let reviewsql = mysql.format('select restaurant_ratings.*,comment,users.name as user_name,profileimage from restaurant_ratings left join users on  restaurant_ratings.user_id = users.id where res_id = ?  and users.status = 1 order by created_at desc limit 10', resId);

    let opencloseTimesql = mysql.format('select monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time from res_openclose_time where res_id = ? limit 1', [resId]);

    let galleryImagessql = mysql.format('select image from restaurant_gallery where res_id = ? order by created_at desc limit 6', [resId]);

    let dicountsql = `select * from discounts where res_id = ${mysql.escape(resId)}`
    return await query_helper.runMultiQuery([detailsql, reviewsql, opencloseTimesql, galleryImagessql, dicountsql]).then(response => {
        if (response && response[0][0].id != null) {

            return res.send({ status: true, msg: "successfully Get", data: { restaurantDetail: response[0], review: response[1], openclosetime: response[2], galleryImages: response[3], discounts: response[4] } })
        } else if (response[0][0].id == null)
            return res.send({ status: false, msg: "Store not found", data: {} })
        else
            return res.send({ status: false, msg: "something went wrong", data: {} })
    })

}

const getcategories = async function (req, res) {
    console.log("get-categories")
    return await resService.getCategories().then(async (response) => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfully get", data: response })
        else
            return res.send({ status: false, msg: "Something went wrong", data: {} })
    });
}


const getsubcategories = async function (req, res) {
    if (req.query.cat_id)
        var cat_id = req.query.cat_id;
    else
        return res.send({ status: false, msg: "category not found" });

    return await resService.getCategories(cat_id).then(async (response) => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfully get", data: response })
        else
            return res.send({ status: false, msg: "Something went wrong", data: {} })
    });
}

const categorySearch = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let cat = req.body.cat;

    let sql = `select name,id,catimg from category where parent_id = 0 and name like ${mysql.escape("%" + cat + "%")}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfullly get", data: { category: response } });
        else
            return res.send({ status: false, msg: "No category found" });
    })
}

const getrestaurantbysubcat = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let limit = 10;
    let { subcat_id, latitude, longitude, page } = req.body;
    let offset = limit * (page - 1);

    let sql = `SELECT claimed,name, status,address,restaurantpic,id,3956 * 2 * ASIN(SQRT(POWER(SIN((${mysql.escape(latitude)} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${mysql.escape(latitude)} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${mysql.escape(longitude)} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance FROM restaurant WHERE status = 1 FIND_IN_SET(${mysql.escape(subcat_id)},restaurant.subcategory) <> 0 ORDER BY distance LIMIT ${limit} OFFSET ${offset}`;


    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfullly get", data: { restaurant: response } });
        else
            return res.send({ status: false, msg: "No Store found" });
    })
}

const getrestaurantbycat = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let limit = 10;
    let { cat_id, latitude, longitude, page } = req.body;
    let offset = limit * (page - 1);


    let sql = `SELECT claimed,restaurant.status,${openclosefields},contact,avg_cost,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name,3956 * 2 * ASIN(SQRT(POWER(SIN((${mysql.escape(latitude)} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${mysql.escape(latitude)} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${mysql.escape(longitude)} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance,(select avg(rating) from restaurant_ratings where res_id = restaurant.id) as avgrating from restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category WHERE  category = ${mysql.escape(cat_id)} ORDER BY distance LIMIT ${limit} OFFSET ${offset}`;


    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfullly get", data: { restaurant: response } });
        else
            return res.send({ status: false, msg: "No store found" });
    })
}

const filterRestaurant = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;
    let limit = 10;
    let { filtertype, latitude, longitude, page } = req.body;
    let offset = limit * (page - 1);
    //get filtertype param and create query according it 
    //  1:-location
    //  2:- Price
    //  3:- review 

    if (filtertype == 1)
        sql = `select claimed,restaurant.status,${openclosefields},contact,avg_cost,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name,3956 * 2 * ASIN(SQRT(POWER(SIN((${mysql.escape(latitude)} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${mysql.escape(latitude)} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${mysql.escape(longitude)} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance,(select avg(rating) from restaurant_ratings where res_id = restaurant.id) as avgrating from restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category where restaurant.status = 1 order by distance LIMIT ${limit} OFFSET ${offset}`;

    if (filtertype == 2)
        sql = `select claimed,restaurant.status,${openclosefields},contact,avg_cost,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name,address,3956 * 2 * ASIN(SQRT(POWER(SIN((${mysql.escape(latitude)} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${mysql.escape(latitude)} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${mysql.escape(longitude)} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance,(select avg(rating) from restaurant_ratings where res_id = restaurant.id) as avgrating from restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category where restaurant.status = 1 having distance < ${config.distance} order by avg_cost LIMIT ${limit} OFFSET ${offset}`;

    if (filtertype == 3)
        sql = `select claimed,restaurant.status,${openclosefields},contact,avg_cost,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name,3956 * 2 * ASIN(SQRT(POWER(SIN((${mysql.escape(latitude)} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${mysql.escape(latitude)} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${mysql.escape(longitude)} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance,(select avg(rating) from restaurant_ratings where res_id = restaurant.id) as avgrating from restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category where restaurant.status = 1 having distance < ${config.distance} ORDER BY avgrating DESC LIMIT ${limit} OFFSET ${offset}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfully get", data: { restaurant: response } })
        else
            return res.send({ status: false, msg: "No Store found", data: {} });

    })

}
const searchRestaurant = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let limit = 10;
    let { filtertype, latitude, longitude, page } = req.body;
    let offset = limit * (page - 1);

    // //get restaurant name
    // let res_name = (req.body.restaurant) ? req.body.restaurant : "";

    let partSql = ''

    if (req.body.restaurant)
        partSql += `and restaurant.name like ${mysql.escape("%" + req.body.restaurant + "%")}`

    if (req.body.city)
        partSql += ` and city = ${mysql.escape(req.body.city)}`

    let sql = `select claimed,restaurant.status,${openclosefields},contact,avg_cost,city,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name,3956 * 2 * ASIN(SQRT(POWER(SIN((${mysql.escape(latitude)} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${mysql.escape(latitude)} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${mysql.escape(longitude)} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance,(select avg(rating) from restaurant_ratings where res_id = restaurant.id) as avgrating from restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category where restaurant.status = 1 ${partSql} ORDER BY restaurant.name LIMIT ${limit} OFFSET ${offset}`;

    console.log(sql);

    return await query_helper.runQuery(sql).then(response => {
        console.log(response)
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "", data: { response } })
        } else {
            return res.send({ status: false, msg: "no Store found", data: {} });
        }
    })
}

const Allmostpopular = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let limit = 10;
    let { latitude, longitude, page } = req.body;
    let offset = limit * (page - 1);

    await resService.getnearestpopularRestaurant(latitude, longitude, limit, offset).then(async (response) => {
        if (response && response.length > 0)
            return res.send({ status: true, data: { restaurant: response } })
        else
            return res.send({ status: false, data: { restaurant: [] } })
    });
}

const Allnewsest = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let limit = 10;
    let { latitude, longitude, page } = req.body;
    let offset = limit * (page - 1);

    await resService.getnewestRestaurant(latitude, longitude, limit, offset).then(resp => {
        if (resp && resp.length > 0)
            return res.send({ status: true, data: { restaurant: resp } })
        else
            return res.send({ status: false, data: { restaurant: [] } })
    })
}

const gallery = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;
    let limit = 12;
    let { res_id } = req.body;
    let page = (req.body.page) ? req.body.page : 1;
    let offset = limit * (page - 1);

    let sql = mysql.format('select image from restaurant_gallery where res_id = ? order by created_at desc limit ? offset ?', [res_id, limit, offset]);

    let nameSql = mysql.format('select name,restaurantpic from restaurant where id = ?', [res_id]);

    return await query_helper.runMultiQuery([sql, nameSql]).then(resp => {
        if (resp && resp.length > 0)
            return res.send({ status: true, data: resp[0], resdetail: resp[1][0] })
        else
            return res.send({ status: false, data: [] })

    })
}


const getreview = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;


    let limit = 10;
    let { res_id } = req.body;
    let page = (req.body.page) ? req.body.page : 1;
    let offset = limit * (page - 1);


    let sql = mysql.format('select restaurant_ratings.*,comment,users.name as user_name,profileimage from restaurant_ratings left join users on  restaurant_ratings.user_id = users.id where res_id = ?  and users.status = 1 order by created_at desc limit ? offset ?', [res_id, limit, offset]);


    return await query_helper.runQuery(sql).then(resp => {
        if (resp && resp.length > 0)
            return res.send({ status: true, data: resp })
        else
            return res.send({ status: false, data: [] })

    })
}



const menu = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let { res_id, user_id } = req.body;

    let sql = mysql.format("SELECT 	sale_price,groupPic,custom_qua,item_cat,city_tax,state_tax,menugroup.id as groupid, mi.id as item_id,customizations,group_name,mi.item_name,mi.item_price,mi.item_pic,item_des,price_des,item_warn,if(out_of_stock = 0 , item_quantity , 0) as item_quantity,mi.is_stamp,mi.min_qty,mi.upc_no FROM menugroup LEFT JOIN menugroupitem as mi on mi.group_id = menugroup.id WHERE (menugroup.restaurant_id = ? AND mi.is_show = 1) ORDER BY menugroup.id", [res_id]);


    //get 4 gallery images
    let galleryImg = mysql.format("select * from restaurant_gallery where res_id = ? limit 4", [res_id]);

    let getTaxes = mysql.format('select city_tax, state_tax , grand_tax from setting where id = 1');

    let getResdetail = mysql.format('select min_order_value,max_order_value,cod,name,status,longitude,latitude,roc.* from restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id where restaurant.id = ?', [res_id]);

    return await query_helper.runMultiQuery([sql, galleryImg, getTaxes, getResdetail]).then(async response => {

        let group_id = -1;
        let groups = []
        let group = [];
        console.log(`outside If loop`, response[0].length)

        if (response[0] && response[0].length > 0) {
            console.log(`inside If loop`)
            for (index = 0 ; index < response[0].length ; index++) {
                // console.log("response[0]", response[0][index])
                let is_fav = false
                // if (user_id) {
                //     await query_helper.runQuery(`select count(*) as num from favorite where user_id = ${user_id} and item_id = ${response[0][index].item_id}`).then(async fav => {
                //         // console.log("fav1: ", fav)
                //         // console.log("fav: ", fav[0].num)
                //         if (fav[0].num > 0) {
                //             is_fav = true
                //         }
                //     })
                // }
                let isStamp = false
                if (response[0][index].is_stamp == 1) {
                    isStamp = true
                }
                if (response[0][index].groupid != group_id) {
                    if (group && index != 0) {
                        group.items = group_items;
                        groups.push(group);
                    }
                    group_id = response[0][index].groupid;

                    group = {};
                    group_items = []
                    group.name = response[0][index].group_name;
                    group.groupid = response[0][index].groupid;
                    group.groupPic = response[0][index].groupPic;
                    if (response[0][index].item_id)
                        group_items.push({ item_id: response[0][index].item_id, item_name: response[0][index].item_name, item_price: response[0][index].item_price, customizations: response[0][index].customizations, city_tax: response[0][index].city_tax, state_tax: response[0][index].state_tax, item_quantity: response[0][index].item_quantity, item_cat: response[0][index].item_cat, item_pic: response[0][index].item_pic, item_des: response[0][index].item_des, price_des: response[0][index].price_des, item_warn: response[0][index].item_warn, custom_qua: response[0][index].custom_qua, sp: response[0][index].sale_price, is_stamp: isStamp, min_qty: response[0][index].min_qty, is_fav: is_fav, upc_no: response[0][index].upc_no });
                } else {
                    if (response[0][index].item_id)
                        group_items.push({ item_id: response[0][index].item_id, item_name: response[0][index].item_name, item_price: response[0][index].item_price, customizations: response[0][index].customizations, city_tax: response[0][index].city_tax, state_tax: response[0][index].state_tax, item_quantity: response[0][index].item_quantity, item_cat: response[0][index].item_cat, item_pic: response[0][index].item_pic, item_des: response[0][index].item_des, price_des: response[0][index].price_des, item_warn: response[0][index].item_warn, custom_qua: response[0][index].custom_qua, sp: response[0][index].sale_price, is_stamp: isStamp, min_qty: response[0][index].min_qty, is_fav: is_fav, upc_no: response[0][index].upc_no });
                }
            }
            console.log('OUTSIDE FOR LOOP')
            // response[0].map((item, index) => {
                
            //     let isStamp = false
            //     if (item.is_stamp == 1) {
            //         isStamp = true
            //     }
            //     if (item.groupid != group_id) {
            //         if (group && index != 0) {
            //             group.items = group_items;
            //             groups.push(group);
            //         }
            //         group_id = item.groupid;

            //         group = {};
            //         group_items = []
            //         group.name = item.group_name;
            //         group.groupid = item.groupid;
            //         group.groupPic = item.groupPic;
            //         if (item.item_id)
            //             group_items.push({ item_id: item.item_id, item_name: item.item_name, item_price: item.item_price, customizations: item.customizations, city_tax: item.city_tax, state_tax: item.state_tax, item_quantity: item.item_quantity, item_cat: item.item_cat, item_pic: item.item_pic, item_des: item.item_des, custom_qua: item.custom_qua, sp: item.sale_price, is_stamp: isStamp, min_qty: item.min_qty });
            //     } else {
            //         if (item.item_id)
            //             group_items.push({ item_id: item.item_id, item_name: item.item_name, item_price: item.item_price, customizations: item.customizations, city_tax: item.city_tax, state_tax: item.state_tax, item_quantity: item.item_quantity, item_cat: item.item_cat, item_pic: item.item_pic, item_des: item.item_des, custom_qua: item.custom_qua, sp: item.sale_price, is_stamp: isStamp, min_qty: item.min_qty });
            //     }
            // })
            group.items = group_items;
            group.groupid = group_id;
            groups.push(group);


            //get all customization of restaurant
            let cussql = `select c.id as cus_id,c.name as cus_name,type, option_name,option_price,ci.id as ci_id from customization as c left join customize_items as ci on ci.customization_id = c.id where group_id in(select id from menugroup where restaurant_id = ${res_id})`;

            return await query_helper.runQuery(cussql).then(resp => {

                if (resp && resp.length > 0) {
                    let cus_id = -1;
                    let customizations = []
                    let cus = [];

                    resp.map((item, index) => {

                        if (item.cus_id != cus_id) {
                            if (cus && index != 0) {
                                cus.items = cus_options;
                                customizations.push(cus);
                            }
                            cus_id = item.cus_id;

                            cus = {};
                            cus_options = []
                            cus.name = item.cus_name;
                            cus.cusid = item.cus_id
                            cus_options.push({ option_name: item.option_name, option_price: item.option_price, ci_id: item.ci_id });
                        } else {
                            cus_options.push({ option_name: item.option_name, option_price: item.option_price, ci_id: item.ci_id });
                        }
                    })
                    cus.items = cus_options;
                    cus.cusid = cus_id;
                    customizations.push(cus);
                    console.log('RESPONDED')

                    return res.send({ status: true, msg: "successfully get", data: groups, customizations, gallery: response[1], res: response[3][0], taxes: response[2][0] });
                } else {
                    console.log('RESPONDED')

                    return res.send({ status: true, msg: "successfully get", data: groups, customizations: [], gallery: response[1], res: response[3][0], taxes: response[2][0] });
                }
            })


        } else {
            console.log('RESPONDED')
            return res.send({ status: true, msg: "successfully get", data: [], customizations: [], gallery: response[1], res: response[3][0], taxes: response[2][0] });
            return res.send({ status: false, msg: "Something went wrong " });
        }
    })
}


//get promotional advert or video
const getAdverts = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res) || req.method != "POST")
        return;

    let random = parseInt(Math.round(Math.random()));
    let { latitude, longitude } = req.body;

    // random = 0
    /*
    random 
        0  = Image
        1  = video  */

    if (random == 0)
        sql = `SELECT pa.id,pa.restaurant_id,restaurantpic, distance, pa.pic, rs.name , rs.address , 3956 * 2 * ASIN(SQRT(POWER(SIN((${latitude} - abs(rs.latitude)) * pi() / 180 / 2),2) + COS(${latitude} * pi() / 180 ) * COS(abs(rs.latitude) * pi() / 180) * POWER(SIN((${longitude} - rs.longitude) * pi() / 180 / 2), 2) )) as c_distance FROM promo_advert as pa LEFT JOIN restaurant as rs ON pa.restaurant_id = rs.id WHERE start_date <= DATE(NOW()) and end_date >= DATE(NOW()) and pa.status = 1 having c_distance < distance ORDER BY rand() limit 3`;

    if (random == 1)
        sql = `SELECT pa.id,pa.restaurant_id, pa.video ,restaurantpic, distance, pa.video_thumb, rs.name , rs.address , 3956 * 2 * ASIN(SQRT(POWER(SIN((${latitude} - abs(rs.latitude)) * pi() / 180 / 2),2) + COS(${latitude} * pi() / 180 ) * COS(abs(rs.latitude) * pi() / 180) * POWER(SIN((${longitude} - rs.longitude) * pi() / 180 / 2), 2) )) as c_distance FROM promo_video as pa LEFT JOIN restaurant as rs ON pa.restaurant_id = rs.id WHERE start_date <= DATE(NOW()) and end_date >= DATE(NOW()) and pa.status = 1 having c_distance < distance ORDER BY rand() limit 3`;

    return await query_helper.runQuery(sql).then(response => {
        if (response)
            return res.send({ status: true, msg: '', data: { type: random, data: response } });
        else
            return res.send({
                status: false, msg: "something went wrong as", data: {}
            })
    })
}

const getResMenu = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { resid } = req.body

    let sql = `select menugroup.id as groupid,group_name,item_name,item_price,menugroupitem.id as itemid from menugroup left join menugroupitem on menugroup.id = menugroupitem.group_id where restaurant_id = ${mysql.escape(resid)}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response)
            return res.send({ status: true, msg: "successfully get", menu: response })
        else
            return res.send({ status: false, msg: "something went wrong" })
    })
}

const claim = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;

    let { res_id, email } = req.body;

    //get admin detail 
    let adminsql = `select email,pref_lang from users where role='admin' and status = 1 limit 1`;
    return await query_helper.runQuery(adminsql).then(resp => {

        mail_helper.mailer(
            { res_id, useremail: email, email: resp[0].email, pref_lang: resp[0].pref_lang },
            { en: "Restaurant Claim", es: "Reclamo de restaurante" },
            "claim"
        );

        res.send({ status: true, msg: 'You have successfully claim on store . Admin will contact you' })
    })
}

// const addtocart = async function (req, res) {
//     if (!fieldvalidator.validationErrors(req, res))
//         return;

//     let { res_id, user_id, cart, city_tax, state_tax, total } = req.body;


//     //get taxes from setting

//     let sql = 'select city_tax, state_tax from setting'

//     await query_helper.runQuery(sql).then(async resp => {

//         let temp_city_tax = 0;
//         let temp_state_tax = 0;
//         let temp_total = 0


//         cart.forEach(ele => {
//             if (ele.taxtype == 'food') {
//                 temp_foodTax += Number(((ele.itemPrice * ele.quantity) * resp[0].food_tax / 100).toFixed(2));
//             }
//             if (ele.taxtype == 'drink') {
//                 temp_drinkTax += Number(((ele.itemPrice * ele.quantity) * resp[0].drink_tax / 100).toFixed(2));
//             }

//             temp_subtotal += Number(ele.itemPrice * ele.quantity);
//         })


//         temp_subtotal = Number((temp_subtotal + temp_foodTax + temp_drinkTax).toFixed(2));
//         temp_grandTax = Number((temp_subtotal * resp[0].grand_tax / 100).toFixed(2));
//         temp_total = Number((temp_subtotal + temp_grandTax).toFixed(2));

//         console.log(temp_foodTax, temp_drinkTax, temp_grandTax, temp_total, temp_subtotal)
//         console.log(food_tax, drink_tax, tax, total, subtotal)

//         if (food_tax != temp_foodTax || drink_tax != temp_drinkTax || tax != temp_grandTax || subtotal != temp_subtotal || total != temp_total) {
//             return res.send({ status: false, msg: "values are incorrect" })
//         }

//         //first delete all cart of that user and insert new one
//         let deletesql = mysql.format('delete from cart where user_id = ? and ordered = 0', [user_id])
//         let insertsql = mysql.format('insert into cart(	user_id,res_id,cart,food_tax,drink_tax,subtotal,tax,total) values (?,?,?,?,?,?,?,?)', [user_id, res_id, JSON.stringify(cart), food_tax, drink_tax, subtotal, tax, total]);

//         return await query_helper.runMultiQuery([deletesql, insertsql]).then(response => {

//             if (response && response.length > 1) {
//                 return res.send({ status: true, msg: "item added into cart successfully", insertId: response[1].insertId })
//             } else {
//                 return res.send({ status: false, msg: "something went wrong" })
//             }
//         })
//     })

// }

const addtocart = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;


    let { res_id, user_id, cart, city_tax, state_tax, total, stamp_paid } = req.body;


    let deletesql = mysql.format('delete from cart where user_id = ? and ordered = 0', [user_id])
    let insertsql = mysql.format('insert into cart(	user_id,res_id,cart,city_tax,state_tax,total,stamp_paid) values (?,?,?,?,?,?,?)', [user_id, res_id, JSON.stringify(cart), city_tax, state_tax, total, stamp_paid]);

    return await query_helper.runMultiQuery([deletesql, insertsql]).then(response => {

        if (response && response.length > 1) {
            return res.send({ status: true, msg: "item added into cart successfully", insertId: response[1].insertId })
        } else {
            return res.send({ status: false, msg: "something went wrong" })
        }
    })


}

const getcart = async function (req, res) {
    let { user_id } = req.query;

    let sql = mysql.format(`select r.min_order_value,r.max_order_value,r.cod,r.status as r_status,r.ath_acc,r.name as res_name,cart.*,${openclosefields},latitude,longitude,stamp_paid,last4 from cart  left join res_openclose_time as roc on roc.res_id = cart.res_id left join restaurant as r on r.id = cart.res_id where user_id = ? and ordered = 0`, [user_id]);
    console.log(sql)
    return await query_helper.runQuery(sql).then(response => {

        if (response) {
            res.send({ status: true, data: response[0] });
        } else {
            res.send({ status: false, data: [] })
        }
    })
}


const clearCart = async function (req, res) {
    let { user_id } = req.query;

    let sql = mysql.format('delete from cart where user_id = ? and ordered = 0', [user_id]);

    return await query_helper.runQuery(sql).then(response => {

        if (response) {
            res.send({ status: true, msg: "Successfully cleared" });
        } else {
            res.send({ status: false, msg: "Something went wrong" })
        }
    })
}

function checkifResAvailable(value) {

    let days = ['sun', 'mon', 'tue', 'wed ', 'thu', 'fri', 'sat'];
    let d = new Date();
    let day = days[d.getDay()].trim()

    console.log('checkTIme', d.getHours(), d.getMinutes())
    //get open and close time of day of restaurant

    if (value[day + 'open_time'] && value[day + 'open_time'] != '' && value[day + 'close_time'] && value[day + 'close_time'] != '') {
        if (d.getTime() > new Date(d.getFullYear(), d.getMonth(), d.getDate(), value[day + 'open_time'].split(':')[0], value[day + 'open_time'].split(':')[1]).getTime() && d.getTime() < new Date(d.getFullYear(), d.getMonth(), d.getDate(), value[day + 'close_time'].split(':')[0], value[day + 'close_time'].split(':')[1]).getTime()) {
            return true;
        } else {

            return false
        }
    }
    return false;
}


function distance(lat1, lon1, lat2, lon2, unit) {
    if ((lat1 == lat2) && (lon1 == lon2)) {
        return 0;
    }
    else {
        var radlat1 = Math.PI * lat1 / 180;
        var radlat2 = Math.PI * lat2 / 180;
        var theta = lon1 - lon2;
        var radtheta = Math.PI * theta / 180;
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        if (dist > 1) {
            dist = 1;
        }
        dist = Math.acos(dist);
        dist = dist * 180 / Math.PI;
        dist = dist * 60 * 1.1515;
        if (unit == "K") { dist = dist * 1.609344 }
        if (unit == "N") { dist = dist * 0.8684 }
        return parseInt(dist);
    }
}


async function checkDiscount(selectOffer, res_id, user_id, subtotal) {

    let discountallow = true;
    let discount_value
    let max_discount_value
    let offerSql = `select * from discounts where id = ${mysql.escape(selectOffer)} and res_id = ${mysql.escape(res_id)}`;
    await query_helper.runQuery(offerSql).then(async response => {
        if (response && response.length > 0) {
            console.log(response)
            discount_value = response[0].percentage
            max_discount_value = response[0].mpd
            //check min ammount
            if (response[0].moa && subtotal < response[0].moa) {
                discountallow = false;
                discount_error_msg = `minimum order ammount ${'$' + response[0].moa} required`
            }

            if (response[0].user_type == "first_time" && user_id == -1) {
                discountallow = false;
                discount_error_msg = `You have to log in to avail this offer`
            }


            //check if discount type is first user than check its first order of user form restaurant
            if (response[0].user_type == "first_time" && discountallow) {
                await query_helper.runQuery(`select count(id) as count from orders where res_id = ${res_id} and user_id = ${user_id}`).then(respp => {
                    if (respp && respp.length > 0) {
                        if (respp[0].count > 1) {
                            discountallow = false;
                            discount_error_msg = `Offer will apply only for first time user`
                        }
                    } else {
                        discountallow = false;
                    }

                })
            }
            // discountallow = false
        } else {
            discountallow = false
        }
    })

    if (discountallow) {
        if (user_id != -1) {
            if (discount_value && discount_value != 0) {
                TotalDiscount = ((subtotal * discount_value) / 100).toFixed(2)
                console.log('max_discount_value', max_discount_value)
                if (max_discount_value && TotalDiscount > max_discount_value)
                    TotalDiscount = max_discount_value
                subtotalAfterDiscount = Number((subtotal - TotalDiscount).toFixed(2))
            }
            return { discountallow, subtotalAfterDiscount, TotalDiscount }
        } else {
            return { discountallow: false, discount_error_msg: 'You have to login for discount' }
        }
    } else
        return { discountallow, discount_error_msg }
}

async function checkDelieveryAvail(res_id, useraddress, delivery_mode, payment_mode, TotalAmmount) {
    let delievery_allow = true;
    let temp = { status: false, msg: 'Something went wrong' }
    let stripe_acc = null;
    let max_order_value = null;
    let min_order_value = null;
    //check if restaurant available
    await query_helper.runQuery(`select min_order_value,max_order_value,stripe_acc,name,res_openclose_time.*,latitude,longitude from res_openclose_time left join restaurant on restaurant.id = res_openclose_time.res_id  where res_id = ${res_id} and status = 1`).then(respp => {
        if (respp && respp.length > 0) {
            // console.log('checkifres', checkifResAvailable(respp[0]))
            // resAllow = checkifResAvailable(respp[0])

            min_order_value = respp[0].min_order_value;
            max_order_value = respp[0].max_order_value;
            stripe_acc = respp[0].stripe_acc;

            temp = {
                status: true,
                stripe_acc: respp[0].stripe_acc,
                res_name: respp[0].name,
                res_lat: respp[0].latitude,
                res_lng: respp[0].longitude
            }

            //check for restaurant distance 
            btwDistance = distance(respp[0].latitude, respp[0].longitude, useraddress.lat, useraddress.lng, 'K');
            if (delivery_mode == 1 && btwDistance > config.distance)
                delievery_allow = false
        }
    })
    // if (!resAllow)
    //     return res.send({ status: false, msg: 'Store not available' })

    // if (payment_mode == 1) {
    //     if (!stripe_acc || stripe_acc == "")
    //         return { status: false, msg: 'Online payment is not available for this store' }
    // }

    if (max_order_value && TotalAmmount > max_order_value)
        return { status: false, msg: `max order ammount ${max_order_value} allowed` }

    if (min_order_value && TotalAmmount < min_order_value)
        return { status: false, msg: `min order ammount ${min_order_value} required` }

    if (!delievery_allow)
        return { status: false, msg: 'Delivery is not available at this location' }
    else
        return temp
}

function checkCart(cart, response) {
    let errorObj = { err: false, type: '' }
    //check if price and name are correct
    cart.forEach(element => {
        let customizationPrice = 0
        if (element.customization) {
            element.customization.forEach(ele => {
                if (ele.option_name != getCusName(response[1], ele.option_id) || ele.option_price != getCusPrice(response[1], ele.option_id)) {
                    errorObj = { err: true, type: 'number' }
                }
                customizationPrice += Number(ele.option_price)
            })
        }
        if (element.itemName != getItemName(response[0], element.itemId) || (element.itemPrice - customizationPrice).toFixed(2) != getItemPrice(response[0], element.itemId)) {
            errorObj = { err: true, type: 'price' }
        }

        let getItemQuantitys = getItemQuantity(response[0], element.itemId)
        if (getItemQuantitys != null && element.quantity > getItemQuantitys) {
            errorObj = { err: true, type: 'quantity' }
        }
    });

    if (errorObj.err) {
        if (errorObj.type == 'number')
            return { status: false, msg: ' Some Items name and Price has been changed. Please clear cart and add them again' }
        if (errorObj.type == 'price')
            return { status: false, msg: ' Some Items  Price has been changed. Please clear cart and  try again' }
        if (errorObj.type == 'quantity')
            return { status: false, msg: 'Some items are not available , please clear cart and add them again' }

    }

    cart.forEach((e, i) => {
        cart[i]['upc_no'] = getUPC(e.itemId, response[0])
    })

    return { status: true, msg: '' }
}

const placeOrder = async function (req, res) {
    if (!fieldvalidator.validationErrors(req, res))
        return;
    
    let { address, total, cart, cart_id, user_id, res_id, extra, token, delivery_mode, payment_mode, selectOffer, selectedtimeslot,resp, cardEle,custId, stamp_paid, fee, referenceNumber,last4Foodstamp, last4_credit } = req.body
    let orderby = req.body.orderby ? req.body.orderby : 'app';
    let subtotal = req.body.extra.subtotal ? req.body.extra.subtotal : 0
    let useraddress = address
    let items = [];
    let cust = [];
    let res_name = '';
    let paymentId = null;
    if (resp!= null) {
        let paymentId = resp.paymentIntent.id;
    }
    console.clear()
    console.log(resp);
    console.log(paymentId);
    resp = resp ? resp : {};
    resp['paymentIntent'] = {}
    console.log("resp: ", resp)
    if (payment_mode == "2" || payment_mode == "0") {
        resp = {}
        resp['paymentIntent'] = {}
    }
    if (payment_mode == "1") {
        resp.paymentIntent["custId"]=custId;
    }
    let subtotalAfterDiscount = null;
    let TotalDiscount = 0
    let stripe_acc = null

    if (selectedtimeslot == -1)
        return res.send({ status: false, msg: "Time Slot not found" })


    if (selectOffer && selectOffer != -1) {   //check if discount is applicable
        let disObject = await checkDiscount(selectOffer, res_id, user_id, subtotal)
        if (disObject.discountallow) {
            subtotalAfterDiscount = disObject.subtotalAfterDiscount
            TotalDiscount = disObject.TotalDiscount
        } else {
            return res.send({ status: false, msg: (disObject.discount_error_msg != '') ? disObject.discount_error_msg : "discount is not applicable" })
        }
    }

    let resObject = await checkDelieveryAvail(res_id, useraddress, delivery_mode, payment_mode, subtotalAfterDiscount ? subtotalAfterDiscount : subtotal)
    console.log(`STRIPE RESP :`,JSON.stringify(resObject))
    if (!resObject.status){
        console.log(`INSIED IF`)
        return res.send({ status: false, msg: resObject.msg })
    }else{
        console.log(`INSIED ELSE`)
        resp.paymentIntent.status = 'succeeded'
        console.log(`resp ${JSON.stringify(resp.paymentIntent)}`)
    }

    res_name = resObject.res_name;
    stripe_acc = resObject.stripe_acc

    cart.forEach(element => {
        items.push(element.itemId);
        if (element.customization) {
            element.customization.forEach(ele => {
                cust.push(ele.option_id)
            })
        }
    });
    console.log(`items.length`,items.length)
    if (items.length > 0) {
        let itemSql = `select id,item_name,item_price,sale_price,if(out_of_stock = 0 , item_quantity , 0) as item_quantity,upc_no from menugroupitem where id in (${items.join()})`;
        let custSql = `select id,option_name,option_price from customize_items where id in (${cust.join()})`

        let sqlArray = [itemSql]
        if (cust.length > 0) {
            sqlArray.push(custSql)
        }
        console.log(`Before Multi Query`)
        return await query_helper.runMultiQuery(sqlArray).then(async response => {
            console.log(`After Multi Query`)
            let checkcart = checkCart(cart, response)
            if (!checkcart.status)
                return res.send(checkcart)

            let OrderSubtotal = subtotalAfterDiscount ? Number(subtotalAfterDiscount) : Number(subtotal)

            if (payment_mode == "1") {
                if (resp.paymentIntent.status != 'succeeded'){
                    console.log(`MOde1: `,{ status: false, msg: resp })
                    return res.send({ status: false, msg: resp })
                }
            }

            //get time slots
            

            // let paymentId=JSON.parse(resp.paymentIntent).id;

            let delieverydate = new Date();
            let timeSlots = null
            let reslot_id = 524;


            // let sql = `select *,DATE_FORMAT(date,'%Y-%m-%d') as date,TIME_FORMAT(to_timeslot, '%h:%i%p') as to_timeslot,TIME_FORMAT(from_timeslot, '%h:%i%p') as from_timeslot from res_delivery_slot where id = ${mysql.escape(selectedtimeslot)}`;
            // await query_helper.runQuery(sql).then(respp => {
            //     if (respp) {
            //         delieverydate = respp[0].date
            //         timeSlots = respp[0].from_timeslot + ' - ' + respp[0].to_timeslot
            //     }
            // })
            let ps = 0
            if (payment_mode == "1") {
                ps = resp.paymentIntent.status=="succeeded" ? 1 : 0
            }

            let delieved_by = (delivery_mode == 1) ? 'owner' : null
            //come here than every thing ok
            let randomNo = Math.floor(100000 + Math.random() * 900000);
            let order_hash = makeOrderHash(32)
            //insert sql
            if (payment_mode == "1") {
                resp.paymentIntent["refunded"]="0";
            }
            let insertsql = mysql.format('insert into orders(user_id,res_id, reslot_id ,cart_id,order_hash,cart,total,city_tax,state_tax,payment_status,payment_data,order_by,status,delivery_mode,payment_mode,delivery_charge,order_code,delivered_by,discount,without_discount,delieverydate, timeSlots,contact_mode, stamp_paid, referenceNumber,last4,last4_credit) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [user_id, res_id, reslot_id, cart_id, order_hash, JSON.stringify(cart), req.body.total, extra.city_tax, extra.state_tax, ps, JSON.stringify(resp.paymentIntent), orderby, 'received', delivery_mode, payment_mode, extra.delivery_charge, randomNo, delieved_by, TotalDiscount, subtotal, delieverydate, timeSlots, extra.contact_mode, stamp_paid, referenceNumber,last4Foodstamp,last4_credit])
            console.log(`insertsql : ${insertsql}`)
            return await query_helper.runQuery(insertsql).then(async resp1 => {
                console.log(`resp1`,resp1)
                if (resp1 && resp1.affectedRows > 0) {
                    //update stripe order id
                    if (payment_mode == 1) {
                        // await stripe.charges.update(JSON.parse(resp).id, {
                        //     // metadata: {
                        //     //     'Order id': resp.insertId,
                        //     //     'Billing Email': useraddress.email,
                        //     //     'Billing User name': useraddress.firstname + ',' + useraddress.lastname,
                        //     //     'Billing address': useraddress.address,
                        //     //     'Billing phone': useraddress.phone,
                        //     //     'Restaurant Name': res_name
                        //     // }
                        // })
                    }
                    await updateAfterOrder(cart_id, resp1.insertId, useraddress, 'received', response[0], cart)

                    let getuserEmail = `select email,pref_lang,name,device_token,platform from users where id = ${user_id}`;
                    let getresOwnerEmail = `SELECT r.email as remail , u.email as uemail,  pref_lang FROM restaurant as r LEFT JOIN users as u on u.id = r.created_by WHERE r.id =  ${res_id}`

                    await query_helper.runMultiQuery([getuserEmail, getresOwnerEmail]).then(result => {
                        if (ps==1 || payment_mode == 2) {
                            let orderemail = result[1][0].remail ? result[1][0].remail : result[1][0].uemail;
                            // console.log('eeil' + orderemail)
                            // console.log('res_name', res_name)
                            //send email to user
                            mail_helper.mailer(
                                { orderid: resp1.insertId, order_hash, email: useraddress.email, pref_lang: result[0][0] ? result[0][0].pref_lang : 'en', res_name },
                                { en: "Order Placed Successfully", es: "Pedido realizado con éxito" },
                                "placeorder"
                            );

                            if (result[0][0] && result[0][0].device_token && result[0][0].device_token != null && result[0][0].device_token != '')
                                pushnotification.send_push(result[0][0].device_token, result[0][0].platform, 'Order Confirmation', `Your order is successfully created . Your Order Id is  ${resp1.insertId}`, 'NewOrder', '', '');

                            //send email to owner 
                            mail_helper.mailer(
                                {
                                    orderid: resp1.insertId, user: result[1], email: orderemail, pref_lang: result[1][0].pref_lang
                                },
                                { en: "New Order Received", es: "Nuevo pedido recibido" },
                                "neworder"
                            );
                        }
                    })
                    if ((payment_mode == 1 && resp.paymentIntent.status) || payment_mode == 2 || payment_mode == 0) {
                        console.log(`Response 1:`, { status: true, msg: "your order has been Confirmed", paymentStatus: true, order_id: resp1.insertId, order_hash })
                        return res.send({ status: true, msg: "your order has been Confirmed", paymentStatus: true, order_id: resp1.insertId, order_hash })
                    } else {
                        console.log(`Response 2`, { status: true, msg: "your order has been declined", paymentStatus: false })
                        return res.send({ status: true, msg: "your order has been declined", paymentStatus: false })
                    }
                } else {
                    console.log(`Response 3`,{ status: false, msg: "something went wrong" })
                    return res.send({ status: false, msg: "something went wrong" })
                }
            })
        })
    } else {
        console.log(`Response 4`, { status: false, msg: 'You have no items in cart' })
        return res.send({ status: false, msg: 'You have no items in cart' })
    }
}


async function makePayment(body, Delievery_Charge, subtotal, delivery_mode, payment_mode, token, stripe_acc,cardEle) {
    var paymentStatus = false;
    var paymentdata = JSON.stringify({});
    var Status = 'received';
    let clientSecret='';
    let delivery_charge = Number(Delievery_Charge)
    let TotalAmmount = subtotal;

    let application_fee_amount = Number(((TotalAmmount * 5) / 100).toFixed(2))

    if (delivery_mode == 1) {
        TotalAmmount = Number((TotalAmmount + delivery_charge).toFixed(2))
        application_fee_amount = Number((application_fee_amount + delivery_charge).toFixed(2))
    }

    console.log('TotalAmmount', TotalAmmount)
    console.log('application_fee_amount', application_fee_amount)

    if (payment_mode == 1) {
        console.log("************************************************************************")

        //get last order id
        //  await query_helper.runQuery(`select id fro`)
        

          const result=await stripe.handleCardPayment(
            clientSecret,
            cardEle,
            {
              payment_method_data: {}
            });
          console.log(result.paymentIntent);
          if(result.error){
              console.log(result.error);
          }  
          console.log("************************************************************************")

        // await stripe.charges.create({
        //     currency: 'usd',
        //     source: token,
        //     application_fee_amount: Math.round(application_fee_amount * 100),
        // }, {
        //     stripeAccount: stripe_acc,
        // }
        // ).then(response => {
        //     console.log(response)
        //     paymentStatus = true;
        //     paymentdata = JSON.stringify(response);
        //     Status = 'received'
        //     // do something in success here
        // }).catch(error => {
        //     paymentStatus = false;
        //     paymentdata = JSON.stringify(error.raw.message)
        //     Status = 'paymentfailed'
        //     // do something in error here
        // })
    }

    if (payment_mode == 3) {
        await resService.AnetPay(body, Number(TotalAmmount)).then(resppp => {
            if (resppp.status) {
                paymentStatus = true;
                paymentdata = JSON.stringify(resppp.msg);
                Status = 'received'
            } else {
                paymentStatus = false;
                paymentdata = JSON.stringify(resppp.msg)
                Status = 'paymentfailed'
            }
        });
    }

    return { paymentStatus, paymentdata, Status, TotalAmmount }
}

function makeOrderHash(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function updateAfterOrder(cart_id, order_id, useraddress, Status, response, cart) {
    //set cart to ordered
    if (cart_id != -1)
        var updtsql = await query_helper.runQuery(`update cart set ordered = 1 where id = ${cart_id}`)

    let addressSql = mysql.format('insert into order_address(order_id,firstname,lastname,phone,address,city,pincode,houseno,lat,lng,formattedAddress,email) values (?,?,?,?,?,?,?,?,?,?,?,?)', [order_id, useraddress.firstname, useraddress.lastname, useraddress.phone, useraddress.address, useraddress.city, useraddress.pincode, useraddress.houseno, useraddress.lat, useraddress.lng, useraddress.formattedAddress, useraddress.email]);

    await query_helper.runQuery(addressSql)

    await query_helper.runQuery(`insert into order_status_detail (order_id,status) value(${order_id}, '${Status}')`);

    //update item quantity
    await query_helper.runQuery(getQuntityUpdateQuery(response, cart))

    return;
}
async function createIntent(req,res){
    console.log("*-*---------------------------------------------------------------*-*-")

    const customer = await stripe.customers.create({
    });
    const { total } = req.body;
    console.log(total)
    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'usd',
        customer: customer.id,
        setup_future_usage: 'off_session'
        
      });
      console.log("//////////////////////////////////////////////////////////////")
     console.log(paymentIntent) 
     console.log("//////////////////////////////////////////////////////////////")

    res.send({"paymentIntent":paymentIntent,"custId":customer.id});
  
}

async function chargeLaterIntent(req,res){
    const{id,total}=req.body;
    let offerSql = `select * from orders where id = ${id}`;
    await query_helper.runQuery(offerSql).then(async response => {
        try {
            console.log("*************************************************************")  
             console.log(JSON.parse(response[0].payment_data))
            console.log("*************************************************************")   

   
        const paymentMethods = await stripe.paymentMethods.list({
            customer: JSON.parse(response[0].payment_data).custId,
            type: 'card',
          });

            const paymentIntent = await stripe.paymentIntents.create({
              amount: Math.round(total * 100),
              currency: 'usd',
              customer: JSON.parse(response[0].payment_data).custId,
              payment_method: JSON.parse(response[0].payment_data).payment_method,
              off_session: true,
              confirm: true,
            });

            if(JSON.parse(response[0].payment_data).hasOwnProperty('next')){
                console.log("//////////////////////////////////////////////////////////////")   
                var temp=JSON.parse(response[0].payment_data);
                temp.next=temp.next.push(JSON.stringify(paymentIntent))
                // JSON.parse(response[0].payment_data)["next"]=JSON.parse(response[0].payment_data)["next"].push(JSON.stringify(paymentIntent));
                // let sqlQ='UPDATE orders SET payment_data = '+JSON.stringify(temp)+' WHERE id = '+id;
                // await query_helper.runQuery(sqlQ).then(async response => {
                    return  res.send({
                        succeeded: true,
                        clientSecret: paymentIntent,
                        paymentMethod:paymentMethods,
                      });
                // });       
                // console.log("//////////////////////////////////////////////////////////////")    
            }
            else{
                var temp=JSON.parse(response[0].payment_data);
                temp.next=[JSON.stringify(paymentIntent)];
                console.log("yesyeysyeyyeyyeyeyesyeysyeyyeyyeyeyesyeysyeyyeyyeyeyesyeysyeyyeyyeye")

                console.log(temp)
                console.log("yesyeysyeyyeyyeyeyesyeysyeyyeyyeyeyesyeysyeyyeyyeyeyesyeysyeyyeyyeye")

                let sqlQ='UPDATE orders SET payment_data, WHERE id = ?';
                // await query_helper.runQuery(sqlQ).then(async response => {
                    console.log(response)
                    return  res.send({
                        succeeded: true,
                        clientSecret: paymentIntent,
                        paymentMethod:paymentMethods,
                      });
                // });       
            }
          } catch (err) {
            // Error code will be authentication_required if authentication is needed
            return  res.send({
                succeeded: false,
                clientSecret:null,
                paymentMethod:null,
              });
          }
        //   try {
        //     const paymentIntent = await stripe.paymentIntents.create({
        //       amount: Math.round(total * 100),
        //       currency: 'usd',
        //       customer: response.payment_data.custId,
        //       payment_method: '{{PAYMENT_METHOD_ID}}',
        //       off_session: true,
        //       confirm: true,
        //     });
        //   } catch (err) {
        //     // Error code will be authentication_required if authentication is needed
        //     console.log('Error code is: ', err.code);
        //     const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
        //     console.log('PI retrieved: ', paymentIntentRetrieved.id);
        //   }  
    });
    
    
}
function getUPC(item_id, data) {
    let t = null;
    data.forEach(e => {
        if (e.id == item_id)
            t = e.upc_no
    })
    return t
}

function getQuntityUpdateQuery(items, cart) {

    console.log(items);
    console.log(cart);

    var sql = `update menugroupitem set item_quantity = (case `;
    var ids = []
    for (const ele of items) {
        if (ele.item_quantity != null) {
            ids.push(ele.id)
            sql += ` when id = ${ele.id} then ${getItemquantityforSql(ele, cart)} `
        }
    }

    sql += ` else item_quantity end) where id in (${ids.join()})`

    console.log(sql);
    return sql;
}

function getItemquantityforSql(item, cart) {
    for (const ele of cart) {
        if (ele.itemId == item.id) {
            return Number(item.item_quantity) - Number(ele.quantity)
        }
    }
}
function getItemName(arr, id) {
    for (const ele of arr) {
        if (ele.id == id)
            return ele.item_name;
    }
}

function getItemQuantity(arr, id) {
    for (const ele of arr) {
        if (ele.id == id)
            return ele.item_quantity;
    }
}

function getItemPrice(arr, id) {
    for (const ele of arr) {
        if (ele.id == id)
            return (ele.sale_price && ele.sale_price != '') ? ele.sale_price : ele.item_price;
    }
}

function getCusName(arr, id) {
    for (const ele of arr) {
        if (ele.id == id)
            return ele.option_name;
    }
}

function getCusPrice(arr, id) {
    for (const ele of arr) {
        if (ele.id == id)
            return ele.option_price;
    }
}

const autoSearch = async function (req, res) {
    let search = req.query.search ? req.query.search : '';

    let sql = `select name,id from restaurant where name like '%${search}%'  limit 5`;

    await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, data: response })
        } else {
            return res.send({ status: false, data: [] })
        }
    })
}

const getOrderDetail = async function (req, res) {
    let order_id = req.body.order_id ? req.body.order_id : -1;
    let order_hash = req.body.order_hash ? req.body.order_hash : -1;
    let user_id = req.body.user_id ? req.body.user_id : -1;

    //get restaurant detail
    var sql = mysql.format("select o.* ,o.id as order_id,o.reslot_id as reslot_id,r.cancel_charge,oa.*,DATE_FORMAT(o.delieverydate,' %Y-%m-%d') as delieverydate,r.name as r_name,if(r.email is null or r.email='',rcu.email,r.email) as r_email,r.address as r_address,r.city as r_city,r.contact as r_contact from orders as o left join order_address as oa on oa.order_id = o.id  left join restaurant as r on r.id = o.res_id left join users as rcu on r.created_by = rcu.id where o.id = ? and order_hash = ? and o.user_id = ?", [order_id, order_hash, user_id]);

    return await query_helper.runQuery(sql).then(async response => {
        console.log(response)
        if (response && response.length > 0) {
            return res.send({ status: true, msg: 'Successfully get', data: response[0], driver: {} })
        } else {
            return res.send({ status: false, msg: 'Something went wrong', data: {} })
        }
    })
}

const getongoingOrders = async function (req, res) {
    let user_id = req.query.user_id ? req.query.user_id : -1

    let sql = mysql.format("select o.id,order_hash,o.status from orders as o left join restaurant as r on r.id = o.res_id where o.user_id = ? and o.status not in ('delivered','cancelled') order by o.id desc limit 1 ", [user_id]);

    console.log(sql)
    await query_helper.runQuery(sql).then(response => {
        if (response && response.length > 0) {
            return res.send({ status: true, msg: "successfully get", data: response })
        }
    })
}

const getOrderStages = async function (req, res) {
    let user_id = req.query.user_id ? req.query.user_id : -1;
    let order_id = req.query.order_id ? req.query.order_id : -1;

    let sql = mysql.format("select osd.*,DATE_FORMAT(osd.created_date,'%Y-%m-%d') as created_date,DATE_FORMAT(osd.created_date,'%h:%i %p') as created_time,TIMEDIFF(NOW(),osd.created_date) as timediff,o.cooking_time from order_status_detail as osd left join orders as o on o.id = osd.order_id where order_id = ?", [order_id]);
    console.log(sql)

    await query_helper.runQuery(sql).then(response => {
        console.log(response)
        if (response) {
            return res.send({ status: true, msg: "successfully get", data: response })
        }
    })
}
const getDiscounts = async function (req, res) {
    let user_id = req.query.user_id ? req.query.user_id : -1;
    let res_id = req.query.res_id ? req.query.res_id : -1;

    await resService.getResDiscount(res_id, user_id).then(response => {
        if (response && response.length > 0)
            return res.send({ status: true, msg: "successfully get", data: response })
        else
            return res.send({ status: false, msg: "something went wrong", data: response })

    })
}

const getDiscountsWithinLocation = async function (req, res) {
    let lat = req.body.lat ? req.body.lat : -1;
    let lng = req.body.lng ? req.body.lng : -1;

    // 3956 * 2 * ASIN(SQRT(POWER(SIN((${lat} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${lat} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${lng} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance

    //get res_ids in distance
    let res_id_sql = `select id, 3956 * 2 * ASIN(SQRT(POWER(SIN((${mysql.escape(lat)} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${mysql.escape(lat)} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${mysql.escape(lng)} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance from restaurant where status = 1 having distance < ${config.distance}`;

    await query_helper.runQuery(res_id_sql).then(async response => {
        if (response && response.length > 0) {
            let res_ids = []
            response.forEach(e => {
                res_ids.push(e.id)
            })
            console.log(res_ids)
            let sql = `select  discounts.*,name,restaurantpic from discounts left join restaurant as r on r.id = discounts.res_id where res_id in (${res_ids.join()})`;
            await query_helper.runQuery(sql).then(respp => {
                if (respp)
                    return res.send({ status: true, msg: 'successfully get', data: respp })
                else
                    return res.send({ status: false, msg: 'No discount', data: {} })
            })
        } else {
            return res.send({ status: false, msg: 'No discount', data: {} })
        }
    })
}

const getTimeslots = async function (req, res) {
    let res_id = req.body.res_id ? req.body.res_id : -1;

    let sql = `select *,DATE_FORMAT(date,'%Y-%m-%d') as date,TIME_FORMAT(to_timeslot, '%h:%i%p') as to_timeslot,TIME_FORMAT(from_timeslot, '%h:%i%p') as from_timeslot from res_delivery_slot where res_id = ${mysql.escape(res_id)} and date >= NOW() AND date <= DATE_ADD(NOW(), INTERVAL 7 DAY)`;
    console.log(sql)
    await query_helper.runQuery(sql).then(response => {
        if (response)
            return res.send({ status: true, msg: 'successfully Get', data: response })
        else
            return res.send({ status: false, msg: "something went wrong", data: {} })
    })
}

const cancelOrder = async function (req, res) {
    let { order_id } = req.body;

    //check if order is still in recieve status
    await query_helper.runQuery(`select o.id,r.name as resname,oa.email as uemail,pref_lang from orders as o left join restaurant as r on r.id = o.res_id left join order_address as oa on oa.order_id = o.id left join users as u on u.id = o.user_id where o.id = ${mysql.escape(order_id)} and o.status = 'received'`).then(async resp => {
        if (resp && resp.length > 0) {
            let sql = `update orders set status = 'cancelled', cancelled_by = 'user' where id = ${mysql.escape(order_id)}`
            await query_helper.runQuery(sql).then(async response => {
                if (response && response.affectedRows > 0) {
                    //send email to notify user 
                    sub = 'Order Cancelled'
                    sub_es = 'Orden Cancelada'

                    msg = ` <p style="margin: 0 0 16px">Hello </p> <p style="margin: 0 0 16px">Your order  #${resp[0].id} has cancelled from ${resp[0].resname} </p> <br><p>Thanks</p>`;

                    msg_es = ` <p style="margin: 0 0 16px">Gracias </p><p style="margin: 0 0 16px">Su pedido # ${resp[0].id} se canceló desde ${resp[0].resname}</p> <br><p>Gracias</p>`;

                    mail_helper.mailer(
                        { email: resp[0].uemail, msg: (resp[0].pref_lang == 'es') ? msg_es : msg },
                        (resp[0].pref_lang == 'es') ? sub_es : sub,
                        "orderStatusChange"
                    );
                    await query_helper.runQuery(`insert into order_status_detail (order_id,status) value(${order_id}, 'cancelled')`)
                    return res.send({ status: true, msg: 'Your order is cancelled successfully' })
                } else {
                    return res.send({ status: false, msg: 'Something went wrong' })
                }
            })
        } else {
            return res.send({ status: false, msg: 'Your order is already start preparing' })
        }
    })
}

const updateFavorite = async function (req, res) {
    let { user_id, item_id, is_fav } = req.body;
    console.log("isFav: ", is_fav)
    if (is_fav) {
        await query_helper.runQuery(`delete from favorite where user_id = ${user_id} and item_id = ${item_id}`).then(async resp => {
            return res.send({ status: true, data, msg: 'Favorite updated successfully' })
        })
    } else {
        await query_helper.runQuery(`insert into favorite (user_id,item_id) value(${user_id}, ${item_id})`).then(async data => {
            return res.send({ status: true, data, msg: 'Favorite updated successfully' })
        })
    }
}

const createFoodstampCard = async function (req, res) {
    let { user_id, card_account, card_number } = req.body;
    await query_helper.runQuery(`insert into foodstamp_cards (user_id,card_account,card_number) value(${user_id}, '${card_account}', '${card_number}')`).then(async data => {
        console.log("data: ", data)
        return res.send({ status: true, data, msg: 'Card created successfully' })
    })
}

const getFoodstampCards = async function (req, res) {
    let { user_id } = req.body;
    await query_helper.runQuery(`select * from foodstamp_cards where user_id = ${user_id}`).then(async data => {
        console.log("data: ", data)
        return res.send({ status: true, data, msg: 'Card created successfully' })
    })
}

module.exports = {
    rateRestaurant,
    homepageRestaurant,
    restaurantDetail,
    getcategories,
    getsubcategories,
    categorySearch,
    filterRestaurant,
    getrestaurantbysubcat,
    Allmostpopular, Allnewsest,
    createIntent,chargeLaterIntent,
    searchRestaurant,
    gallery, menu, getAdverts, getrestaurantbycat, getreview,
    getResMenu, claim, addtocart, getcart, placeOrder, clearCart, autoSearch, getOrderDetail, getongoingOrders, getOrderStages, getDiscounts, getDiscountsWithinLocation, getTimeslots, cancelOrder, updateFavorite, createFoodstampCard, getFoodstampCards
};

