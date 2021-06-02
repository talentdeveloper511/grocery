restaurantServices = require('../../../services/restaurantService');
var query_helper = require("../../../helpers/database_helper");
var config = require("../../../config/config");
var fieldvalidator = require("../../../middleware/validator");
var mysql = require("mysql");

const getrestaurantlist = async function (req, res) {
    if (req.method == "POST") {
        let post = req.body;
        //Get user ID to detail
        let userID = req.query.userid;
        //check if token userid and query id are equal 
        if (req.userData.userid && userID && req.userData.userid != userID)
            res.send({ status: false, msg: "You are not authrize", data: {} });
        let columns = {
            0: 'id',
            2: 'restaurantName',
            3: 'userName',
            4: 'created_at'
        };

        if (userID && userID > 0 && userID != undefined) {
            let sql = `SELECT created_by as user_id,restaurant.id,restaurant.name as restaurantName,restaurant.status,restaurant.restaurantpic,users.name as userName,DATE_FORMAT(created_at,'%Y-%m-%d') as created_at,claimed FROM restaurant LEFT JOIN users ON users.id = restaurant.created_by `;
            if (post.search.value) {
                sql +=
                    'WHERE restaurant.name LIKE ' +
                    mysql.escape('%' + post.search.value + '%') +
                    "OR CONVERT(restaurant.created_at,CHAR) LIKE " +
                    mysql.escape('%' + post.search.value + '%') +
                    ' OR users.name LIKE ' +
                    mysql.escape('%' + post.search.value + '%') + '';
            }

            let query_result_org = await query_helper.runQuery(sql);
            recordTotal = query_result_org.length;
            filterRecord = query_result_org.length;

            sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

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
const changerestaurantStatus = async function (req, res) {
    let post = req.body;
    let restaurantid = post.id;
    let status = post.status

    let sql = `UPDATE restaurant SET status = ${mysql.escape(status)} WHERE id = ${mysql.escape(restaurantid)}`;
    return await query_helper.runQuery(sql).then(response => {
        if (response.affectedRows && response.affectedRows > 0) {
            return res.send({
                status: 200, msg: "Store status update successfully", data: {}
            });
        } else {
            return res.send({ status: false, msg: "Unable to update", data: {} });
        }
    });
}

const getuserFeedbacks = async function (req, res) {
    if (req.method == "POST") {
        let post = req.body;

        let columns = {
            0: 'id',
            1: 'username',
            2: 'subject',
            3: 'created_at'
        };


        let sql = `SELECT user_feedack.*,DATE_FORMAT(created_at, '%Y-%m-%d') as created_at,users.name as username FROM user_feedack LEFT JOIN users ON users.id = user_feedack.user_id `;
        if (post.search.value) {
            sql +=
                'WHERE subject LIKE ' +
                mysql.escape('%' + post.search.value + '%') +
                "OR CONVERT(user_feedack.created_at,CHAR) LIKE " +
                mysql.escape('%' + post.search.value + '%') +
                ' OR users.name LIKE ' +
                mysql.escape('%' + post.search.value + '%') + '';
        }

        let query_result_org = await query_helper.runQuery(sql);
        recordTotal = query_result_org.length;
        filterRecord = query_result_org.length;

        sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

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
        res.send({ status: false, msg: "not found", data: {} });
    }


}

const getrestaurant = async function (req, res) {
    if (!req.query.res_id || isNaN(req.query.res_id) || req.query.res_id < 1)
        res.send({ status: false, msg: "Store Id is invalid" })

    let { res_id, loggedInUser_Id } = req.query;
    //get loggedIn user detail
    let sql = mysql.format('select role from users where id = ?', [loggedInUser_Id]);

    return await query_helper.runQuery(sql).then(async response1 => {
        let detailsql = mysql.format('select stripe_acc,ath_acc,ath_secret,website,status,can_edit_discount,can_edit_menu,can_edit_reservation,can_edit_order,claimed,created_by,restaurant.id,restaurant.name as restaurant_name,avg_cost,cat1.name as category_name,contact,restaurant.description,description_es,subcategory,GROUP_CONCAT(cat2.name) as subcat_name,restaurantpic,city,address,latitude,longitude,(select avg(rating) from restaurant_ratings  where res_id = ?) as rating from restaurant left join category as cat1 on restaurant.category = cat1.id left join category as cat2 on FIND_IN_SET(cat2.id, restaurant.subcategory) where restaurant.id = ?', [res_id, res_id]);

        let opencloseTimesql = mysql.format('select monopen_time, monclose_time, tueopen_time, tueclose_time, wedopen_time, wedclose_time, thuopen_time, thuclose_time, friopen_time, friclose_time, satopen_time, satclose_time, sunopen_time, sunclose_time from res_openclose_time where res_id = ? limit 1', [res_id]);


        return await query_helper.runMultiQuery([detailsql, opencloseTimesql]).then(response => {
            if (response && response.length > 0 && response[0].length > 0 && response[0][0].id != null) {
                if (response[0][0].created_by == loggedInUser_Id || response1[0].role == "admin")
                    return res.send({ status: true, msg: "successfully Get", data: response[0][0], openclose_time: response[1][0] });
                else
                    return res.send({ status: false, msg: "store doesn't belong to you", });
            } else
                return res.send({ status: false, msg: "store not found" });
        })
    })
}

const deletereview = async function (req, res) {
    if (!req.query.review_id || isNaN(req.query.review_id) || req.query.review_id < 1)
        res.send({ status: false, msg: "Review Id is invalid" });

    let review_id = req.query.review_id;

    let sql = `delete from restaurant_ratings where id = ${review_id}`;
    return await query_helper.runQuery(sql).then(response => {

        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Successfully deleted" });
        else
            return res.send({ status: false, msg: "Something went wrong" });
    })
}

const getcategorySuggestion = async function (req, res) {
    if (req.method == "POST") {
        let post = req.body;

        let columns = {
            0: 'id',
            1: 'username',
            2: 'category',
            3: 'created_at'
        };


        let sql = `SELECT suggest_category.*,DATE_FORMAT(suggest_category.created_at, '%Y-%m-%d') as created_at,users.name as username FROM suggest_category LEFT JOIN users ON users.id = suggest_category.user_id `;
        if (post.search.value) {
            sql +=
                'WHERE category LIKE ' +
                mysql.escape('%' + post.search.value + '%') +
                "OR CONVERT(suggest_category.created_at,CHAR) LIKE " +
                mysql.escape('%' + post.search.value + '%') +
                ' OR users.name LIKE ' +
                mysql.escape('%' + post.search.value + '%');

        }

        let query_result_org = await query_helper.runQuery(sql);
        recordTotal = query_result_org.length;
        filterRecord = query_result_org.length;

        sql += ` ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

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
        res.send({ status: false, msg: "not found", data: {} });
    }
}

const getAdverts = async function (req, res) {

    let post = req.body;

    let columns = {
        0: 'id',
        2: 'restaurant_name',
        3: 'userName',
        4: 'start_date',
        5: 'end_date',
        7: 'created_at',
    };

    let sql = `SELECT promo_advert.id,restaurant_id,users.name as userName,user_id,pic,DATE_FORMAT(promo_advert.start_date,'%Y-%m-%d') as start_date,DATE_FORMAT(promo_advert.end_date,'%Y-%m-%d') as end_date,promo_advert.status,DATE_FORMAT(promo_advert.created_at,'%Y-%m-%d') as created_at,restaurant.name as restaurant_name FROM promo_advert LEFT JOIN restaurant ON restaurant.id = promo_advert.restaurant_id LEFT JOIN users ON users.id = user_id `;
    if (post.search.value) {
        sql +=
            'WHERE restaurant.name LIKE ' +
            mysql.escape('%' + post.search.value + '%') +
            "OR CONVERT(promo_advert.start_date,CHAR) LIKE " +
            mysql.escape('%' + post.search.value + '%') +
            "OR CONVERT(promo_advert.end_date,CHAR) LIKE " +
            mysql.escape('%' + post.search.value + '%') +
            ' OR users.name LIKE ' +
            mysql.escape('%' + post.search.value + '%') + '';
    }



    let query_result_org = await query_helper.runQuery(sql);
    recordTotal = query_result_org.length;
    filterRecord = query_result_org.length;

    sql += `ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response) {
            return res.send({
                status: 200, msg: "", data: response, recordsTotal: recordTotal,
                recordsFiltered: filterRecord
            });
        } else {
            return res.send({ status: false, msg: "something went wrong", data: {} });
        }
    });

}



const changeAdvertsStatus = async function (req, res) {

    let { id, status } = req.body;

    let sql = mysql.format('update promo_advert set status = ? where id = ?', [status, id]);

    return await query_helper.runQuery(sql).then(response => {

        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Advert status successfully updated", data: {} });
        else
            return res.send({ status: false, msg: "something went wrong", data: {} });
    })
}


const getAdvertvideo = async function (req, res) {

    let post = req.body;

    let columns = {
        0: 'id',
        2: 'restaurant_name',
        3: 'userName',
        4: 'start_date',
        5: 'end_date',
        7: 'created_at',
    };

    let sql = `SELECT promo_video.id,video_thumb,video,restaurant_id,users.name as userName,user_id,DATE_FORMAT(promo_video.start_date,'%Y-%m-%d') as start_date,DATE_FORMAT(promo_video.end_date,'%Y-%m-%d') as end_date,promo_video.status,DATE_FORMAT(promo_video.created_at,'%Y-%m-%d') as created_at,restaurant.name as restaurant_name FROM promo_video LEFT JOIN restaurant ON restaurant.id = promo_video.restaurant_id LEFT JOIN users ON users.id = user_id `;
    if (post.search.value) {
        sql +=
            'WHERE restaurant.name LIKE ' +
            mysql.escape('%' + post.search.value + '%') +
            "OR CONVERT(promo_video.start_date,CHAR) LIKE " +
            mysql.escape('%' + post.search.value + '%') +
            "OR CONVERT(promo_video.end_date,CHAR) LIKE " +
            mysql.escape('%' + post.search.value + '%') +
            ' OR users.name LIKE ' +
            mysql.escape('%' + post.search.value + '%') + '';
    }

    let query_result_org = await query_helper.runQuery(sql);
    recordTotal = query_result_org.length;
    filterRecord = query_result_org.length;

    sql += `ORDER BY ${columns[post.order[0].column]}  ${post.order[0].dir} LIMIT ${post.start} , ${post.length}`;

    return await query_helper.runQuery(sql).then(response => {
        if (response) {
            return res.send({
                status: 200, msg: "", data: response, recordsTotal: recordTotal,
                recordsFiltered: filterRecord
            });
        } else {
            return res.send({ status: false, msg: "something went wrong", data: {} });
        }
    });

}



const changeAdvertVideoStatus = async function (req, res) {

    let { id, status } = req.body;

    let sql = mysql.format('update promo_video set status = ? where id = ?', [status, id]);

    return await query_helper.runQuery(sql).then(response => {

        if (response && response.affectedRows > 0)
            return res.send({ status: true, msg: "Advert Video status successfully updated", data: {} });
        else
            return res.send({ status: false, msg: "something went wrong", data: {} });
    })
}


module.exports = {
    getrestaurantlist, changerestaurantStatus, getuserFeedbacks, getcategorySuggestion, getrestaurant, deletereview,
    getAdverts, changeAdvertsStatus, getAdvertvideo, changeAdvertVideoStatus
};
