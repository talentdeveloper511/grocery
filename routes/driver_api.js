var express = require("express");
var router = express.Router();
var usercontroller = require("../controllers/driver/usercontroller");
var fieldvalidator = require("../middleware/validator");
var appfieldvalidator = require("../middleware/AppValidator");
var checkuserauth = require("../middleware/check-authforUser");
var multer = require('multer');
var multerservice = require("../services/multerServices");


router.get("/", function (req, res) {

    //console.log('driver')
});

router.ws('/updatelocation', function (ws, req) {

    ws.on('message', async function (msg) {
        //console.log('local asdf')
        //Check User Authentication

        /*********************  Forte**** 
     
        URL :-  ws://localhost:3000/driver/updatelocation

        {"lat":2,"lng":3,"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RkcmlAbWFpbGluYXRvci5jb20iLCJ1c2VyaWQiOjExOCwiaWF0IjoxNTkxODc2Njk4LCJleHAiOjE1OTE5NjMwOTh9.H3IHX8RI0Hgp8RRYXoCHsg9y3xV6v4tUti8v0nzyQMo","user_id":118}
     
        ************forte **************** */
        let data = JSON.parse(msg);
        ws.send(JSON.stringify(await usercontroller.updateDriverlocation(data)))
    });
});

router.post("/registration", fieldvalidator.validate("createUser"), usercontroller.registration);
router.post("/loginbySocial", fieldvalidator.validate("Sociallogin"), usercontroller.registrationbySocial);

router.post("/login", fieldvalidator.validate("login"), usercontroller.login);

router.post("/forgetPassword", fieldvalidator.validate("forgetPassword"), usercontroller.forgetPassword);

router.post("/resetpassword", fieldvalidator.validate("resetPassword"), usercontroller.resetPassword);

router.get("/activeuser", usercontroller.activeUser);

router.post("/update", multer(multerservice.multerconf).single('profilepic'), checkuserauth, appfieldvalidator.validate("updateUser"),
    usercontroller.updateProfile
);
router.post("/orders-history", checkuserauth, usercontroller.orderhistory);
router.post("/availForDelivery", checkuserauth, appfieldvalidator.validate('availForDelivery'), usercontroller.availForDelivery)
router.post("/accept-delievery", checkuserauth, appfieldvalidator.validate("accept-delievery"), usercontroller.acceptDelievery)
router.post("/getOrderDetail", checkuserauth, usercontroller.getOrderDetail);
router.get("/pickup-request", checkuserauth, usercontroller.pickupRequest);
router.post("/changeorderstatus", checkuserauth, usercontroller.changeorderstatus);
router.post('/verifyUserCode', checkuserauth, usercontroller.verifyUserCode);
router.post('/user/updatePaymentStatus', checkuserauth, usercontroller.updatePaymentStatus)
router.get('/logout', checkuserauth, usercontroller.logout);
router.post('/getOnGoingOrders', checkuserauth, usercontroller.getOnGoingOrders)

module.exports = router;
