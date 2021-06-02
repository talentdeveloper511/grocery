var mysql = require("mysql");
var query_helper = require("../helpers/database_helper");
var helperFunctions = require("../helpers/functions_helper");
var config = require("../config/config");
var fieldvalidator = require("../middleware/validator");
var { validationResult } = require("express-validator/check");
var sqlclient = require('mysql-queries');
var mail_helper = require("../helpers/mailer_helper");
var pushnotification = require("../helpers/notification");
var driver_notification = require("../helpers/driver_notification")

//get menu group of restaurant
const getGroupCategory = async function (resid) {
    let sql = `select id,group_name from menugroup where restaurant_id = ${resid}`;

    return await query_helper.runQuery(sql).then(response => {

        if (response)
            return { 'status': 200, 'msg': 'successfully', 'data': response };
        else
            return { 'status': false, 'msg': 'Something went wrong', response };
    })
}

const CreateGroup = async function (data) {

    //console.log(data);

    //Here we run query according insert and update
    if (data.groupId != -1) {
        let extraQuery = (data.groupPic) ? `,groupPic = '${data.groupPic}'` : ''
        sql1 = `update menugroup set restaurant_id = ${data.resid} , group_name = '${data.groupname}' ${extraQuery} where id = ${data.groupId}`;
    } else {
        let groupPic = data.groupPic ? data.groupPic : null
        sql1 = `insert into menugroup (restaurant_id, group_name,groupPic) values ('${data.resid}','${data.groupname}','${groupPic}')`;
    }
    //console.log(sql1);

    return await query_helper.runQuery(sql1).then(async (response) => {

        if (response && response.affectedRows > 0) {
            if (data.items.length > 0) {
                //create query to insert and update accor dingly 
                if (data.groupId > 0 && data.groupId != -1) {
                    DataArr = []; sqls = [];
                    groupId = (data.groupId != -1) ? data.groupId : response.insertId;
                    name_case = "", price_case = "", image_case = "", ids = "", cus_case = "", tax_case = "", quantity_case = ""
                    upc_no_case = "", item_des_case = "", price_des_case = "", item_warn_case = "", city_tax_case = "", item_cat_case = "", custom_qua_case = "", sale_price_case = '', out_of_stock_case = '', is_show_case = '', is_stamp_case = '', is_msc_case = "", min_qty_case = ''
                    data.items.forEach((element, i) => {
                        if (element.item_id && element.item_id != "" && element.item_id != null) {
                            name_case += `when id = ${element.item_id} then ${mysql.escape(element.name)} `;
                            price_case += `when id = ${element.item_id} then ${element.price} `;
                            sale_price_case += `when id = ${element.item_id} then ${element.sale_price} `;
                            image_case += `when id = ${element.item_id} then '${element.itempic}' `;
                            cus_case += `when id = ${element.item_id} then '${element.cus}' `;
                            tax_case += `when id = ${element.item_id} then ${element.taxtype} `;
                            city_tax_case += `when id = ${element.item_id} then ${element.city_tax} `;
                            quantity_case += `when id = ${element.item_id} then ${element.quantity} `;
                            custom_qua_case += `when id = ${element.item_id} then ${element.custom_qua} `;
                            upc_no_case += `when id = ${element.item_id} then '${element.upc_no}' `;
                            item_des_case += `when id = ${element.item_id} then ${mysql.escape(element.item_des)} `;
                            price_des_case += `when id = ${element.item_id} then ${mysql.escape(element.price_des)} `;
                            item_warn_case += `when id = ${element.item_id} then ${mysql.escape(element.item_warn)} `;
                            item_cat_case += `when id = ${element.item_id} then ${mysql.escape(element.item_cat)} `;
                            out_of_stock_case += `when id = ${element.item_id} then ${(element.out_of_stock) ? 1 : 0} `;
                            is_show_case += `when id = ${element.item_id} then '${element.is_show}' `;
                            is_stamp_case += `when id = ${element.item_id} then '${element.is_stamp}' `;
                            is_msc_case += `when id = ${element.item_id} then '${element.is_msc}' `;
                            min_qty_case += `when id = ${element.item_id} then '${element.min_qty}' `;
                            ids += `${element.item_id},`
                        }
                        else {
                            DataArr[i] = `(${groupId},${mysql.escape(element.name)},${element.price},${element.sale_price},'${element.itempic}','${element.cus}',${element.taxtype},${element.city_tax},${element.quantity},${element.custom_qua},'${element.upc_no}',${mysql.escape(element.item_des)},${mysql.escape(element.price_des)},${mysql.escape(element.warn_des)},${mysql.escape(element.item_cat)},${(element.out_of_stock) ? 1 : 0},'${element.is_show}','${element.is_stamp}','${element.is_msc}','${element.min_qty}')`;
                        }
                    });

                    if (JSON.parse("[" + ids.slice(0, -1) + "]").length > 0) {
                        let updatequery = `UPDATE menugroupitem SET item_name = (case ${name_case} end),item_price= (case ${price_case} end),sale_price= (case ${sale_price_case} end),item_pic = (case ${image_case} end),customizations= (case ${cus_case} end),state_tax= (case ${tax_case} end),city_tax= (case ${city_tax_case} end),item_quantity = (case ${quantity_case} end),custom_qua = (case ${custom_qua_case} end),item_des = (case ${item_des_case} end),price_des = (case ${price_des_case} end),item_warn = (case ${item_warn_case} end),item_cat = (case ${item_cat_case} end),upc_no = (case ${upc_no_case} end),out_of_stock = (case ${out_of_stock_case} end),is_show = (case ${is_show_case} end),is_stamp = (case ${is_stamp_case} end),is_msc = (case ${is_msc_case} end),min_qty = (case ${min_qty_case} end) WHERE id in ( ${ids.slice(0, -1)} )`;
                        sqls.push(updatequery);
                        //console.log(updatequery)
                    }


                    if (JSON.parse("[" + ids.slice(0, -1) + "]").length > 0)
                        sqls.push(`DELETE FROM menugroupitem where id NOT IN ( ${ids.slice(0, -1)} ) and group_id = ${groupId} `);
                    else
                        sqls.push(`DELETE FROM menugroupitem where group_id = ${groupId} `);


                    if (DataArr.length > 0)
                        sqls.push(`insert into menugroupitem (group_id,item_name,item_price,sale_price,item_pic,customizations,state_tax,city_tax,item_quantity,custom_qua,upc_no,item_des,price_des,item_warn,item_cat,out_of_stock,is_show,is_stamp,is_msc,min_qty) values ${DataArr.filter(Boolean).join()}`);

                }
                else {

                    DataArr = []; let groupId = (data.groupId != -1) ? data.groupId : response.insertId;
                    data.items.forEach((element, i) => {
                        DataArr[i] = `(${groupId},${mysql.escape(element.name)},${mysql.escape(element.price)},${mysql.escape(element.sale_price)},'${element.itempic}','${element.cus}',${element.taxtype},${element.city_tax},${element.quantity},${element.custom_qua},'${element.upc_no}',${mysql.escape(element.item_des)},${mysql.escape(element.price_des)},${mysql.escape(element.item_warn)},${mysql.escape(element.item_cat)},${(element.out_of_stock) ? 1 : 0},'${element.is_show}','${element.is_stamp}','${element.is_msc}','${element.min_qty}')`;
                    });
                    let insertData = DataArr.join();

                    sqls = [`insert into menugroupitem (group_id,item_name,item_price,sale_price,item_pic,customizations,state_tax,city_tax,item_quantity,upc_no,item_des,price_des,item_warn,item_cat,out_of_stock,is_show,is_stamp,is_msc,min_qty) values ${insertData}`

                    ];
                }
                //console.log(sqls);
                return await query_helper.runMultiQuery(sqls).then(async (result) => {
                    if (result) {
                        let sql = `select group_name,id from menugroup where restaurant_id = ${data.resid}`;
                        return await query_helper.runQuery(sql).then(resp => {
                            if (resp)
                                return { 'status': 200, 'msg': 'successfully added', 'groups': resp };
                            else
                                return { 'status': false, 'msg': 'Something went wrong', response };
                        })
                    } else
                        return { 'status': false, 'msg': 'Something went wrong', response };
                })
            } else {
                let sql = `select group_name,id from menugroup where restaurant_id = ${data.resid}`;
                return await query_helper.runQuery(sql).then(resp => {
                    if (resp)
                        return { 'status': 200, 'msg': 'successfully added', 'groups': resp };
                    else
                        return { 'status': false, 'msg': 'Something went wrong', response };
                })
            }
        } else {
            return { 'status': false, 'msg': 'Something went wrong', response };
        }
    })

}

const getmenuGroup = async function (resid, groupId) {
    //get group name and its menu items
    sqls = [`select id,group_name,groupPic,categories from menugroup where restaurant_id = ${resid} and id = ${groupId}`,
    `select * from menugroupitem where group_id = ${groupId}`, `select id,name from customization where group_id = ${groupId}`]
    return await query_helper.runMultiQuery(sqls).then(result => {
        if (result)
            return { 'status': 200, 'msg': 'successfully Get', 'group': result[0][0], 'menuitems': result[1], cus: result[2] };
        else
            return { 'status': false, 'msg': 'Something went wrong' };
    })
}

const getmenuCustomization = async function (resid, groupId) {
    //get group name and its menu items
    sqls = [`select id,group_name from menugroup where restaurant_id = ${resid} and id = ${groupId}`,
    `select * from customization where group_id = ${groupId}`]
    return await query_helper.runMultiQuery(sqls).then(result => {
        if (result)
            return { 'status': 200, 'msg': 'successfully Get', 'group': result[0][0], 'customizations': result[1] };
        else
            return { 'status': false, 'msg': 'Something went wrong' };
    })
}
const deletemenuGroup = async function (resid, groupId) {
    //get group name and its menu items
    sqls = [`select item_pic from menugroupitem where group_id = ${groupId}`, `delete from menugroup where restaurant_id = ${resid} and id = ${groupId}`, `delete from menugroupitem where group_id = ${groupId}`, `select group_name,id from menugroup where restaurant_id = ${resid}`, `delete from customize_items where customization_id in (select id from customization where group_id = ${groupId})`, `delete from customization where group_id = ${groupId}`]


    return await query_helper.runMultiQuery(sqls).then(result => {

        if (result) {
            // result[0].map(item => { helperFunctions.deleteFile('public/' + item['item_pic']); });
            return { 'status': 200, 'msg': 'Delete successfully', 'groups': result[3] };
        }
        else
            return { 'status': false, 'msg': 'Something went wrong' };
    })
}

const DeleteRestaurant = async function (resid) {

    //get group name and its menu items
    sqls = [`select item_pic from menugroupitem where group_id in (select id from menugroup where restaurant_id = ${mysql.escape(resid)} ) `, `select restaurantpic from restaurant where id = ${mysql.escape(resid)}`, `delete from menugroupitem where group_id in (select id from menugroup where restaurant_id = ${mysql.escape(resid)} )`, `delete from menugroup where restaurant_id = ${mysql.escape(resid)}`, `delete from restaurant_ratings where res_id = ${mysql.escape(resid)}`, `delete from res_openclose_time where res_id = ${mysql.escape(resid)}`, `delete from restaurant_ratings where res_id = ${mysql.escape(resid)}`, `delete from restaurant_gallery where res_id = ${mysql.escape(resid)}`, `delete from promo_advert where restaurant_id = ${mysql.escape(resid)}`, `delete from promo_video where restaurant_id = ${mysql.escape(resid)}`, `delete from checkin_likes where checkin_id in (select id from check_in where res_id = ${mysql.escape(resid)})`, `delete from check_in where res_id = ${mysql.escape(resid)}`, `delete from restaurant where id = ${mysql.escape(resid)}`]

        ;
    return await query_helper.runMultiQuery(sqls).then(result => {
        if (result) {
            //   result[0].map(item => { helperFunctions.deleteFile('public/' + item['item_pic']); });
            result[1].map(item => { helperFunctions.deleteFile('public/' + item['restaurantpic']); });
            return { 'status': true, 'msg': 'Delete successfully' };
        }
        else
            return { 'status': false, 'msg': 'Something went wrong' };
    })
}

const changeStatus = async function (response, orderstatus, orderId, orderissue) {


    // let pickup = true;
    // if (orderstatus == 'pickup') {
    //     await query_helper.runQuery(`select code_verify,delivery_mode from driver_orders left join orders as o on o.id = driver_orders.order_id where order_id = ${orderId}`).then(r => {
    //         if (r && r.length > 0) {
    //             //console.log(r)
    //             //delivery_mode = 1 : home delievery
    //             if (r[0].delivery_mode == 1 && r[0].code_verify == 0)
    //                 pickup = false;
    //         }
    //     })
    // }

    // if (!pickup)
    //     return { status: false, msg: "Code Verification is not completed" }


    //check for order code if status delievered
    let check_for_order_payment = true;
    let check_for_order_code_verify = true;
    if (orderstatus == 'delivered') {
        //check for code varified
        await query_helper.runQuery(`select code_verified,payment_status from orders where id = ${orderId}`).then(response => {
            if (response[0].payment_status == 1) {
                check_for_order_payment = true;
            } else {
                check_for_order_payment = false;
            }

            if (response && response[0].code_verified == 1) {
                check_for_order_code_verify = true;
            } else {
                check_for_order_code_verify = false;
            }
        })
    }

    if (!check_for_order_payment)
        return { status: false, msg: "Order Payment is not completed" }
    // if (!check_for_order_code_verify)
    //     return { status: false, msg: "User code is not verified" }


    //change status
    let changeStatusSql = mysql.format('update orders set status = ? where id = ?', [orderstatus, orderId])
    return await query_helper.runQuery(changeStatusSql).then(async resp => {

        if (resp && resp.affectedRows > 0) {
            //update ordered delievered when pickup  
            if (orderstatus == 'delivered' || orderstatus == 'cancelled') {
                await query_helper.runQuery(`update driver_orders set order_delivered = 1 where order_id = ${orderId}`)

                //update issue 
                if (orderissue != '') {
                    await query_helper.runQuery(`update orders set orderissue = ${mysql.escape(orderissue)} where id = ${orderId}`);
                }
            }

            //check if order status exist

            //insert into order status detail
            await query_helper.runQuery(`SELECT id FROM order_status_detail where order_id= ${orderId} and status='${orderstatus}'`).then(async rrr => {
                if (rrr && rrr.length > 0) {
                    //update and remove records
                    await query_helper.runQuery(`update order_status_detail set created_date = NOW() where id = ${rrr[0].id}`)
                    // let tempArr = ['received', 'preparing', 'ready', 'pickup', 'delivered', 'cancelled']
                } else {
                    await query_helper.runQuery(`insert into order_status_detail (order_id,status) value(${orderId}, '${orderstatus}')`)
                }
            })

            //send email to user when order complete or cancelled
            let msg = '';
            let msg_es = '';
            let sub = '';
            let sub_es = '';
            if (orderstatus == 'delivered') {
                sub = 'Order Delivered'
                sub_es = 'Pedido entregado'
                if (orderissue && orderissue != '') {
                    msg = ` <p style="margin: 0 0 16px">Hello </p> <p style="margin: 0 0 16px">Your order has #${response[0].id} delivered from ${response[0].resname} with following issue</p>
            <p style="margin: 0 0 16px">${orderissue}</p><br><p>Thanks</p>`;
                    msg_es = `  <p style="margin: 0 0 16px">Gracias </p><p style="margin: 0 0 16px">Su pedido tiene # ${response[0].id} entregado desde ${response[0].resname} con el siguiente problema</p>
               <p style="margin: 0 0 16px">${orderissue}</p><br><p>Gracias</p>`
                }
                else {
                    msg = `  <p style="margin: 0 0 16px">Hello </p> <p style="margin: 0 0 16px">Your order has #${response[0].id} successfully delivered from ${response[0].resname} </p>
                <br><p>Thanks</p> `
                    msg_es = `<p style="margin: 0 0 16px">Gracias </p> <p style="margin: 0 0 16px">Su pedido tiene # ${response[0].id} entregado con éxito desde ${response[0].resname}</p>
                <br> <br><p>Gracias</p>`
                }
            }

            if (orderstatus == 'cancelled') {
                sub = 'Order Cancelled'
                sub_es = 'Orden Cancelada'
                msg = ` <p style="margin: 0 0 16px">Hello </p> <p style="margin: 0 0 16px">Your order has #${response[0].id} cancelled from ${response[0].resname} with following issue</p>
                <p style="margin: 0 0 16px">${orderissue}</p> <br><p>Thanks</p>`;
                msg_es = ` <p style="margin: 0 0 16px">Gracias </p><p style="margin: 0 0 16px">Su pedido tiene # ${response[0].id} cancelada desde ${response[0].resname} con el siguiente problema</p>
                <p style="margin: 0 0 16px">${orderissue}</p><br><p>Gracias</p>`
            }

            if (orderstatus == 'delivered' || orderstatus == 'cancelled') {
                //console.log((response[0].pref_lang == 'es') ? msg_es : msg)
                mail_helper.mailer(
                    { email: response[0].uemail, msg: (response[0].pref_lang == 'es') ? msg_es : msg },
                    (response[0].pref_lang == 'es') ? sub_es : sub,
                    "orderStatusChange"
                );
            }

            if (orderstatus = 'ready') {
                //send a mail to delivery
                await query_helper.runQuery(`select driveremail,DATE_FORMAT(orders.delieverydate,' %Y-%m-%d') as delieverydate from orders left join restaurant on restaurant.id = orders.res_id  where orders.id = ${mysql.escape(orderId)}`).then(respp => {
                    //console.log(respp)
                    if (respp && respp.length > 0 && respp[0].driveremail) {
                        //send email
                        sub = 'Pickup Notification, Order Ready to pickup';
                        msg = ` <p style="margin: 0 0 16px">Hello </p> <p style="margin: 0 0 16px">A order #${response[0].id} ready to pickup from ${response[0].resname}.</p>
                        <p style="margin: 0 0 16px">Assigned Delievery date is ${respp[0].delieverydate}</p> <br><p>Thanks</p>`;

                        //console.log('respp[0].driveremail', respp[0].driveremail)
                        mail_helper.mailer(
                            { email: respp[0].driveremail, msg: msg },
                            sub,
                            "orderStatusChange"
                        );
                    }
                })
            }
            // if (orderstatus = 'pickup') {
            //     //get pickup user device token
            //     await query_helper.runQuery(`select device_token from users where id = (select user_id from driver_orders where 	order_id = ${orderId}) limit 1`).then(rr => {

            //         if (rr && rr[0])
            //             driver_notification.send_push(e.device_token, e.platform, 'Pickup Request', `You have got a new Order Pick Request`, 'pickup_request', '', '');
            //     })

            // }
            if (response[0].device_token && response[0].device_token != null && response[0].device_token != '')
                pushnotification.send_push(response[0].device_token, response[0].platform, 'Order Status Change', getUserNOtificationmsg(orderId, orderstatus), 'OrderStatusChange', '', '');

            return { status: true, msg: "status update successfully" }
        } else {
            return { status: false, msg: "Something went wrong" }
        }
    })
}

function getUserNOtificationmsg(orderId, orderstatus) {
    let msg = `Your order ${orderId} status is  changed to ${orderstatus}`

    return msg
}

module.exports = {
    getGroupCategory,
    CreateGroup,
    getmenuGroup,
    deletemenuGroup,
    DeleteRestaurant, getmenuCustomization, changeStatus
};

