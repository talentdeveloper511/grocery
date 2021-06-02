const { body } = require("express-validator/check");
var mysql = require("mysql");
var query_helper = require("../helpers/database_helper");
var { validationResult } = require("express-validator/check");

exports.validate = method => {
    switch (method) {
        case "rateRestaurant": {
            return [
                body("user_id", "User is required").exists().isNumeric(),
                body("res_id")
                    .exists()
                    .withMessage("Restaurant is required")
                    .isNumeric()
                    .withMessage("Restaurant is invalid")
                    .custom(async (email, { req }) => {
                        let sql = `SELECT * FROM restaurant WHERE id = ${req.body.res_id} `;
                        return await query_helper.runQuery(sql).then(response => {
                            if (response.length > 0) {
                                return true;
                            } else {
                                return false;
                            }
                        });
                    }).withMessage("Restaurant not found"),
                body("waiting").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid waiting value'),
                body("restrooms").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid restrooms value'),
                body("ambience").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid ambience value'),
                body("service").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid service value'),
                body("food").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid food value'),
                body("pricing").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid pricing value'),
                body("management").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid management value'),
                body("locality").exists().isInt({ min: 0, max: 5 }).withMessage('Invalid locality value'),
            ];
        }
        case "updateUser": {

            return [
                body("name", "name is required").exists(),
                body("city", "city is required").exists(),
                body("address", "address is required").exists(),
                body("phone", "phone is required").exists(),
                body("user_id", "User ID is required").exists(),
                body("dob", "Date of birth is required").exists(),
                //body("about", "About is required").exists(),
                body("email")
                    .exists()
                    .withMessage("Email is required")
                    .isEmail()
                    .withMessage("Email is invalid")
                    .custom(async (email, { req }) => {
                        let sql = `SELECT id FROM users WHERE email = '${req.body.email}' and id <> ${parseInt(req.body.id)} `;
                        return await query_helper.runQuery(sql).then(response => {

                            if (response.length > 0) {
                                return false;
                            } else {
                                return true;
                            }
                        });
                    })
                    .withMessage("Email already exist")
            ];
        }
        case "homeRestaurant": {
            return [
                // body("user_id", "User is required").exists().isNumeric(),
                body("latitude")
                    .exists()
                    .withMessage("latitude is required").isNumeric().withMessage("latitude is incorrect"),
                body("longitude")
                    .exists()
                    .withMessage("longitude is required").isNumeric().withMessage("longitude is incorrect")
            ];
        }
        case "restaurantdetail": {
            return [
                // body("user_id", "User is required").exists().isNumeric(),
                body("res_id", "Restaurant is required").exists().isNumeric().withMessage("invalid Restaurant Id")
            ]
        }
        case "categorysearch": {
            return [
                body("cat", "category is required").exists()
            ]
        }
        case "getrestaurantbysubcat": {
            return [
                body("subcat_id", "Subcategory is required").exists(),
                body("latitude")
                    .exists()
                    .withMessage("latitude is required").isNumeric().withMessage("latitude is incorrect"),
                body("longitude")
                    .exists()
                    .withMessage("longitude is required").isNumeric().withMessage("longitude is incorrect"),
                body("page", "page is required").exists().isNumeric().withMessage("page is not correct")
            ]
        }
        case "getrestaurantbycat": {
            return [
                body("cat_id", "category is required").exists(),
                body("latitude")
                    .exists()
                    .withMessage("latitude is required").isNumeric().withMessage("latitude is incorrect"),
                body("longitude")
                    .exists()
                    .withMessage("longitude is required").isNumeric().withMessage("longitude is incorrect"),
                body("page", "page is required").exists().isNumeric().withMessage("page is not correct")
            ]
        }
        case "filterRestaurant": {
            return [
                body("filtertype", "Filter Type is required").exists(),
                body("latitude")
                    .exists()
                    .withMessage("latitude is required").isNumeric().withMessage("latitude is incorrect"),
                body("longitude")
                    .exists()
                    .withMessage("longitude is required").isNumeric().withMessage("longitude is incorrect"),
                body("page", "page is required").exists().isNumeric().withMessage("page is not correct")
            ]
        }
        case "allRestaurant": {
            return [
                body("latitude")
                    .exists()
                    .withMessage("latitude is required").isNumeric().withMessage("latitude is incorrect"),
                body("longitude")
                    .exists()
                    .withMessage("longitude is required").isNumeric().withMessage("longitude is incorrect"),
                body("page", "page is required").exists().isNumeric().withMessage("page is not correct")
            ]
        }
        case "checkIn": {
            return [
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body("res_id", "Restaurant is required").exists().isNumeric().withMessage("Restaurant is invalid"),
                body("comment", "Comment is required").exists()
            ]
        }
        case "getappusers": {
            return [
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body('user', "User is required").exists()
            ]
        }
        case "usercheckIn": {
            return [
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body("page", "page is required").exists().isNumeric().withMessage("page is not correct")
            ]
        }
        case "friend-request": {
            return [
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body('requesteduser_id', "Requested User is required").exists().isNumeric().withMessage("Requested User is invalid"),
            ]
        }
        case "requests": {
            return [
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body("page", "page is required").exists().isNumeric().withMessage("page is not correct")
            ]
        }
        case "friend-request-action": {
            return [
                body('friend_request_id', "Friend Request Id  is required").exists().isNumeric().withMessage("Friend Request Id is invalid"),
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body("action", "User Action is required").exists().isNumeric().withMessage("User Action is not correct")
            ]
        }
        case "sharefeedback": {
            return [
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body('subject', 'Subject is required').exists(),
                body('feedback', 'Feedback is required').exists()
            ]
        }
        case "checkin-like": {
            return [
                body('user_id', "User is required").exists().isNumeric().withMessage("User is invalid"),
                body('checkin_id', "Checkin Id is required").exists().isNumeric().withMessage("Checkin Id is invalid"),
            ]
        }
        case "suggestcategory": {
            return [
                body('user_id', 'User is required').exists().isNumeric().withMessage('User Id is invalid'),
                body('category', 'Category is required').exists()
            ]
        }
        case "friend-detail": {
            return [
                body('user_id', 'User is required').exists().isNumeric().withMessage('User Id is invalid'),
                body('friend_id', 'friend id is required').exists().isNumeric().withMessage('Friend Id is invalid'),
            ]
        }
        case "contactus": {
            return [
                body('firstname', 'First Name is required').exists(),
                body('lastname', 'Last Name is required').exists(),
                body('email', 'Email is required').exists().isEmail().withMessage('Email is invalid'),
                body('message', 'Message is required').exists(),
            ]
        }
        case "getmenu": {
            return [
                body('resid', 'Restaurant id is required').exists()
            ]
        }
        case "add-address": {
            return [
                body('id', 'Id is required').exists().isNumeric().withMessage('Id is invalid'),
                body('firstname', 'First Name is required').exists(),
                body('lastname', 'Last Name is required').exists(),
                body('country', 'Message is required').exists(),
                body('phone', 'phone is required').exists(),
                body('city', 'city is required').exists(),
                body('pincode', 'pincode is required').exists(),
                body('houseno', 'houseno is required').exists(),
                body('address', 'address is required').exists(),
                body('user_id', 'User Id is required').exists().isNumeric().withMessage('User Id is invalid'),
                body('lng', 'Longitude is required').exists(),
                body('lat', 'Latitude is required').exists(),
                body('formattedAddress', 'Formatted Address is required').exists(),

            ]
        }
        case "delete-address": {
            return [
                body('id', 'Id is required').exists().isNumeric().withMessage('Id is invalid'),
                body('user_id', 'User Id is required').exists().isNumeric().withMessage('User Id is invalid')
            ]
        }
        case "claimRes": {
            return [
                body('res_id', 'Restaurant Id is required').exists().isNumeric().withMessage('Restaurant Id is invalid'),
                body('email', 'Email Id is required').exists().isEmail().withMessage('Email is invalid')
            ]
        }
        case "addtocart": {
            return [
                body('res_id', 'Restaurant Id is required').exists().isNumeric().withMessage('Restaurant Id is invalid'),
                body('user_id', 'User Id is required').exists().isNumeric().withMessage('User Id is invalid'),
                body('cart', 'Cart is required').exists()
            ]
        }
        case "placeorder": {
            return [
                body('res_id', 'Restaurant Id is required').exists().isNumeric().withMessage('Restaurant Id is invalid'),
                body('user_id', 'User Id is required').exists().isNumeric().withMessage('User Id is invalid'),
                body('cart_id', 'Cart Id is required').exists().isNumeric().withMessage('User Id is invalid'),
                body('address', 'Address is required').exists(),
                body('total', 'Total is required').exists().isNumeric().withMessage('Total is invalid'),
                body('cart', 'cart is required').exists(),
                body('delivery_mode', 'Delivery Mode is required').exists().isNumeric().withMessage('Delivery Mode is invalid'),
                body('payment_mode', 'Payment Mode is required').exists().isNumeric().withMessage('Payment Mode is invalid'),

            ]
        }
        case "make-reservation": {
            return [
                body('res_id', 'Restaurant Id is required').exists().isNumeric().withMessage('Restaurant Id is invalid'),
                body('user_id', 'User Id is required').exists().isNumeric().withMessage('User Id is invalid'),
                body('date', 'Date is required').exists(),
                body('time', 'Time is required').exists(),
                body('people', 'People is required').exists()
            ]
        }
        case "getslot": {
            return [
                body('res_id', 'Restaurant Id is required').exists().isNumeric().withMessage('Restaurant Id is invalid'),
                body('date', 'Date is required').exists(),
            ]
        }
        case "driverReg": {
            return [
                body('firstname', 'firstname is required').exists(),
                body('lastname', 'lastname is required').exists(),
                body('email', 'email is required').exists(),
                body('phone', 'phone is required').exists(),
                body('job_avail', 'job type is required').exists(),
                body('date_can_start', 'start date is required').exists(),
                body('vahical_type', 'vahical type is required').exists()
            ]
        }
        case "driverReg": {
            return [
                body('firstname', 'firstname is required').exists(),
                body('lastname', 'lastname is required').exists(),
                body('email', 'email is required').exists(),
                body('phone', 'phone is required').exists(),
            ]
        }
        case "availForDelivery": {
            return [
                body('status', 'Status is required').exists().isInt().withMessage("status should be integer")
            ]
        }
        default: {
            return []
        }
    }
};

exports.validationErrors = (req, res) => {
    const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
    if (!errors.isEmpty()) {
        res.status(422).json({ status: false, errors: errors.array() });
        return false;
    } else {
        return true;
    }
}
