const { body } = require("express-validator/check");
var mysql = require("mysql");
var query_helper = require("../helpers/database_helper");

var { validationResult } = require("express-validator/check");

exports.validate = method => {
  switch (method) {
    case "createUser": {
      return [
        body("name", "name is required").exists(),
        body("role", "role is requiured").exists(),
        body("email")
          .exists()
          .withMessage("Email is required")
          .isEmail()
          .withMessage("Invalid email")
          .custom(async (email, { req }) => {
            let sql = mysql.format("SELECT id FROM users WHERE `email` = ?", [
              email
            ]);

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
    case "Sociallogin": {
      return [
        body("name", "name is required").exists(),
        body("role", "role is requiured").exists(),
        body("email")
          .exists()
          .withMessage("Email is required")
          .isEmail()
          .withMessage("Email is invalid")
      ];
    }
    case "login": {
      return [
        body("email")
          .exists()
          .withMessage("Email is required")
          .isEmail()
          .withMessage("Email is invalid")
      ];
    }
    case "forgetPassword": {
      return [
        body("email").exists().withMessage("Email is required").isEmail().withMessage("Email is invalid")
      ]
    }
    case "resetPassword": {
      return [
        body("email").exists().withMessage("Email is required").isEmail().withMessage("Email is invalid"),
        body("password", "password is required").exists(),
        body("token", "token is required").exists(),
      ]
    }
    case "changepassword": {
      return [
        body("oldpassword", "old password is required").exists().isLength({ min: 6, max: 25 }).withMessage('old password has Invalid Length'),
        body("newpassword", "new password is required").exists().isLength({ min: 6, max: 25 }).withMessage('new password has invalid Length')
      ]
    }
    case "updateUser": {

      return [
        body("name", "name is required").exists(),
        body("city", "city is required").exists(),
        body("address", "address is required").exists(),
        body("phone", "phone is required").exists(),
        body("id", "User ID is required").exists(),
        body("role", "User Role is required").exists(),
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
    case "createPage": {
      return [
        body("page", "Page Title is required").exists(),
        body("content", "Page Content is required").exists(),
      ]
    }
    case "updatePage": {
      return [
        body("id", "Page Id is required").exists().isNumeric().withMessage('Page Id is invalid'),
        body("page", "Page Title is required").exists(),
        body("content", "Page Content is required").exists(),
      ]
    }
    case "savecategory": {
      return [
        body("name", "Category name is required").exists(),
      ]
    }
    case "savesubcategory": {
      return [
        body("name", "Category name is requires").exists(),
        body("parentid", "Parent category is requires").exists(),
      ]
    }
    case "createrestaurant": {
      return [
        body("name", "Restaurant name is required").exists(),
        body('email', "Email is require").exists().isEmail().withMessage('Email is invalid'),
        body("address", "Restaurant address is required").exists(),
        body("status", "status name is required").exists(),
        body("created_by", "create_by is required"),
        body("contact", "Contact No. is required").exists(),
        body("descriptiones", "Description ES is required").exists(),
        body("description", "Description is required").exists()
      ]
    }
    case "addPromoAdvert": {
      return [
        body("restaurant_id", "Restaurant is required").exists().isNumeric().withMessage('Restaurant id is required'),
        body("start_date", "Start Date is required").exists(),
        body("end_date", "End Date is required").exists(),
        body("advertId", "Advert Id is required").exists()
      ]
    }
    case "advertbyid": {
      return [
        body("id", "Advert Id is required").exists()
      ]
    }
    case "delete-advert": {
      return [
        body("advert_id", "Advert Id is required").exists().isNumeric()
      ]
    }
    case "changeadvertstatus": {
      return [
        body("id", "Advert Id is required").exists().isNumeric(),
        body("loggedInUser_Id", "User Id is required").exists().isNumeric(),
        body("status", "Status is required").exists().isInt({ min: 0, max: 1 }),
      ]
    }
    case "user-reviews": {
      return [
        body("res_id", "Restaurant Id is required").exists().isNumeric(),
        body("search", "Search is required").exists(),
        body("sortby", "Sort By is required").exists(),
        body("page", "Page is required").exists().isNumeric(),
      ]
    }
    case "sendmsgValidation": {
      return [
        body('msg', 'Message is required').exists(),
        body('role', 'Role is required').exists()
      ]
    }
    case "updatesetting": {
      return [
        body("city", "city is required").exists(),
        body("address", "address is required").exists(),
        body("contact", "phone is required").exists(),
        body("email", "Email is required").exists().isEmail().withMessage('Email is invalid'),
        body("city_tax", "Food Tax is required").exists().isNumeric({ min: 0, max: 100 }).withMessage('Food tax is invalid'),
        body("state_tax", "Drink Tax is required").exists().isNumeric({ min: 0, max: 100 }).withMessage('Drink tax is invalid'),
      ]
    }

    case "savecustomization": {
      return [
        body("customize_id", "Customize id is required").exists(),
        body("group_id", "Group id is required").exists(),
        body("name", "Name id is required").exists(),
        body("options", "Options is required").exists(),
        // body("type", "Type is required").exists(),
      ]
    }
    case "addfaq": {
      return [
        body("title", "Title is required").exists(),
        body("description", "Description is required").exists()
      ]
    }
    case "changeorderstatus": {
      return [
        body("orderstatus", "Order Status is required").exists(),
        body("orderId", "Order Id is required").exists().isNumeric().withMessage("Order Id is invalid")
      ]
    }
    case "changeOwner": {
      return [
        body("ownerId", "Owner Id is required").exists().isNumeric().withMessage('Owner id is Required'),
        body("res_id", "Restaurant id is required").exists().isNumeric().withMessage('Restaurant id is Required'),
        body("claimedstatus", "Claim Status is Required").exists()
      ]
    }
    case "checkCodeOfDriver": {
      return [
        body("orderid", "Order id is required").exists(),
        body("code", "Code is required").exists().isInt().withMessage("Code is invalid")
      ]
    }
    case "savediscount": {
      return [
        body('res_id', 'Restaurant id is required').exists(),
        body("percentage", "Percentage is required").exists(),
        body("moa", "Min Order Ammount is required").exists(),
        body("mpd", "Max Price Discount is required").exists()
      ]
    }
    case "save-editor": {
      return [
        body('name', 'Name id is required').exists(),
        body('res_id', 'Restaurant id is required').exists(),
        body('status', 'Status is required').exists(),
        body("email", "Email is required").exists().isEmail(),
        body("password", "password is required").exists(),
        body("confirmPassword", "confirmPassword is require").exists()
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
