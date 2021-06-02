var mysql = require("mysql");
var query_helper = require("../../helpers/database_helper");
var helperFunctions = require("../../helpers/functions_helper");
var Config = require("./../../config/config");
const { response } = require("express");

var ApiContracts = require('authorizenet').APIContracts;
var ApiControllers = require('authorizenet').APIControllers;
var SDKConstants = require('authorizenet').Constants;

let openclosefields = 'monopen_time,monclose_time,tueopen_time,tueclose_time,wedopen_time,wedclose_time,thuopen_time,thuclose_time,friopen_time,friclose_time,satopen_time,satclose_time,sunopen_time,sunclose_time';

const getnearestpopularRestaurant = async function (lat, lng, limit = 10, offset = 0) {
    //get nearest restaurant
    sql = `SELECT claimed,restaurant.status,${openclosefields},contact,avg_cost,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name, 3956 * 2 * ASIN(SQRT(POWER(SIN((${lat} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${lat} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${lng} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance ,(select avg(rating) from restaurant_ratings where res_id = restaurant.id) as avgrating FROM restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category where restaurant.status = 1  having distance < ${Config.distance} ORDER BY avgrating desc limit ${limit} offset ${offset}`;

    return await query_helper.runQuery(sql).then(response => {
        return response;
    })
}

const getnewestRestaurant = async function (lat, lng, limit = 10, offset = 0) {
    //get nearest restaurant
    sql = `SELECT claimed,restaurant.status,${openclosefields},contact,avg_cost,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name, 3956 * 2 * ASIN(SQRT(POWER(SIN((${lat} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${lat} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${lng} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance,(select avg(rating) from restaurant_ratings where res_id = restaurant.id) as avgrating,restaurant.created_at FROM restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category where restaurant.status = 1  having distance < ${Config.distance} ORDER BY restaurant.created_at desc limit ${limit} offset ${offset}`;

    return await query_helper.runQuery(sql).then(response => {
        return response;
    })
}

const getbannerRestaurant = async function (lat, lng) {
    //sql = `SELECT pa.id,pa.restaurant_id, pa.pic, rs.name , rs.address FROM promo_advert as pa LEFT JOIN restaurant as rs ON pa.restaurant_id = rs.id WHERE start_date <= DATE(NOW()) and end_date >= DATE(NOW()) and pa.status = 1 ORDER BY pa.id DESC limit 3`;

    sql = `SELECT claimed,restaurant.status,${openclosefields},contact,avg_cost,restaurantpic,restaurant.id,restaurant.name,address,category.id as cat_id,category.name as cat_name, 3956 * 2 * ASIN(SQRT(POWER(SIN((${lat} - abs(restaurant.latitude)) * pi() / 180 / 2),2) + COS(${lat} * pi() / 180 ) * COS(abs(restaurant.latitude) * pi() / 180) * POWER(SIN((${lng} - restaurant.longitude) * pi() / 180 / 2), 2) )) as distance,restaurant.created_at FROM restaurant left join res_openclose_time as roc on roc.res_id = restaurant.id  left join category on category.id = restaurant.category where restaurant.status = 1  having distance < ${Config.distance} ORDER BY rand() limit 4`

    return await query_helper.runQuery(sql).then(response => {

        return response;
    })
}

const getCategories = async function (parent_id = 0) {
    sql = `select id,name,catimg from category where parent_id = ${parent_id}`;
    return await query_helper.runQuery(sql).then(response => {
        return response;
    })
}

const getResDiscount = async function (res_id, user_id) {

    let sql = `select * from discounts where res_id = ${mysql.escape(res_id)} `

    await query_helper.runQuery(`select count(id) as count from orders where res_id = ${res_id} and user_id = ${user_id}`).then(respp => {
        if (user_id != -1 && respp && respp[0].count > 1)
            sql += "and user_type != 'first_time'"
    })
    //console.log(sql)
    return await query_helper.runQuery(sql).then(
        response => {
            //console.log(response)
            if (response && response.length > 0 && user_id != -1)
                return response
            else
                return {}
        }
    )
}

const AnetPay = async function (post, ammount) {

    return new Promise((resolve, reject) => {

        let cardno = post.Anet_credit_card.creditCard.replace(/\s/g, '');
        let expdate = post.Anet_credit_card.expirationDate.replace(' / ', '');
        let cvc = post.Anet_credit_card.cvc;

        let order_id = post.order_id ? post.order_id : -1;
        let driver_user_id = post.driver_user_id ? post.driver_user_id : -1;

        let billing_address = post.address

        var merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
        merchantAuthenticationType.setName(Config.AnetLoginId);
        merchantAuthenticationType.setTransactionKey(Config.AnetTransactionId);

        var creditCard = new ApiContracts.CreditCardType();
        creditCard.setCardNumber(cardno);
        creditCard.setExpirationDate(expdate);
        creditCard.setCardCode(cvc);

        var paymentType = new ApiContracts.PaymentType();
        paymentType.setCreditCard(creditCard);

        if (order_id != -1 && driver_user_id != -1) {
            //console.log('heree rer')
            // var orderDetails = new ApiContracts.PaymentDetails();
            // orderDetails.setInvoiceNumber(order_id);
            // orderDetails.setDescription(driver_user_id);
        }

        if (billing_address) {
            var billTo = new ApiContracts.CustomerAddressType();
            billTo.setFirstName(billing_address.firstname ? billing_address.firstname : '');
            billTo.setLastName(billing_address.lastname ? billing_address.lastname : '');
            billTo.setEmail(billing_address.email ? billing_address.email : '');
            billTo.setAddress(billing_address.address ? billing_address.address : '');
            billTo.setCity(billing_address.city ? billing_address.city : '');
        }
        var transactionSetting1 = new ApiContracts.SettingType();
        transactionSetting1.setSettingName('duplicateWindow');
        transactionSetting1.setSettingValue('60');

        var transactionSetting2 = new ApiContracts.SettingType();
        transactionSetting2.setSettingName('recurringBilling');
        transactionSetting2.setSettingValue('false');

        var transactionSettingList = [];
        transactionSettingList.push(transactionSetting1);
        transactionSettingList.push(transactionSetting2);

        var transactionSettings = new ApiContracts.ArrayOfSetting();
        transactionSettings.setSetting(transactionSettingList);

        var transactionRequestType = new ApiContracts.TransactionRequestType();
        transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
        transactionRequestType.setPayment(paymentType);
        transactionRequestType.setAmount(ammount);
        // transactionRequestType.setOrder(orderDetails);
        if (billing_address) {
            transactionRequestType.setBillTo(billTo);
        }
        transactionRequestType.setTransactionSettings(transactionSettings);

        var createRequest = new ApiContracts.CreateTransactionRequest();
        createRequest.setMerchantAuthentication(merchantAuthenticationType);
        createRequest.setTransactionRequest(transactionRequestType);

        // //console.log(JSON.stringify(createRequest.getJSON(), null, 2));

        var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
        //Defaults to sandbox
        //ctrl.setEnvironment(SDKConstants.endpoint.production);

        ctrl.execute(function () {

            var apiResponse = ctrl.getResponse();

            var response = new ApiContracts.CreateTransactionResponse(apiResponse);
            //console.log('b in fun')

            // //console.log(JSON.stringify(response, null, 2));

            if (response != null) {
                if (response.getMessages().getResultCode() == ApiContracts.MessageTypeEnum.OK) {
                    if (response.getTransactionResponse().getMessages() != null) {
                        // //console.log('Successfully created transaction with Transaction ID: ' + response.getTransactionResponse().getTransId());
                        // //console.log('Response Code: ' + response.getTransactionResponse().getResponseCode());
                        // //console.log('Message Code: ' + response.getTransactionResponse().getMessages().getMessage()[0].getCode());
                        // //console.log('Description: ' + response.getTransactionResponse().getMessages().getMessage()[0].getDescription());
                        resolve({ status: true, msg: response.getTransactionResponse() })
                    }
                    else {
                        //console.log('Failed Transaction.');
                        if (response.getTransactionResponse().getErrors() != null) {
                            // //console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
                            // //console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
                            resolve({ status: false, msg: response.getTransactionResponse().getErrors() })
                        }
                        resolve({ status: false, msg: 'Failed Transaction.' })
                    }
                }
                else {
                    //console.log('Failed Transaction. ');
                    if (response.getTransactionResponse() != null && response.getTransactionResponse().getErrors() != null) {

                        // //console.log('Error Code: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorCode());
                        // //console.log('Error message: ' + response.getTransactionResponse().getErrors().getError()[0].getErrorText());
                        // //console.log('a', JSON.stringify(response.getTransactionResponse()))

                        resolve({ status: false, msg: response.getTransactionResponse().getErrors().getError()[0].getErrorText() })
                    }
                    else {
                        // //console.log('b', JSON.stringify(response.getMessages()))
                        // //console.log('Error Code: ' + response.getMessages().getMessage()[0].getCode());
                        // //console.log('Error message: ' + response.getMessages().getMessage()[0].getText());

                        resolve({ status: false, msg: response.getMessages().getMessage()[0].getText() })
                    }
                }
            }
            else {
                //console.log('Null Response.');
                resolve({ status: false, msg: 'Failed Transaction.' })
            }
            //callback(response);
        });
    });
}



module.exports = {
    getnearestpopularRestaurant,
    getnewestRestaurant,
    getCategories,
    getbannerRestaurant,
    getResDiscount,
    AnetPay
};