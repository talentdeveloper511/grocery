var express = require("express");
var router = express.Router();
var passport = require("passport");
var path = require("path");
var usercontroller = require("../controllers/app/usercontroller");
var restaurantcontroller = require("../controllers/app/restaurantController");
var feedcontroller = require("./../controllers/app/feedController");
var fieldvalidator = require("../middleware/validator");
var appfieldvalidator = require("../middleware/AppValidator");
var checkuserauth = require("../middleware/check-authforUser");
var multer = require('multer');
var multerservice = require("../services/multerServices");
var backendRestauraneCotroller = require("./../controllers/backend/users/restaurant");
var fs = require('fs');


// Route for Website user functinality

var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

router.get("/", function (req, res) {

    // deleteFolderRecursive('controllers/app/testki')

    //console.log(new Date().getTime());
    let d = new Date()
    //console.log(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
    //console.log(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime());
    // Assign current time to a variable
    const now = new Date();

    // Print local and UTC timezones
    //console.log(now.getHours());
    //console.log(now.getUTCHours());
    return;
});

router.post("/registration", fieldvalidator.validate("createUser"), usercontroller.registration);
router.post("/loginbySocial", fieldvalidator.validate("Sociallogin"), usercontroller.registrationbySocial);

router.post("/login", fieldvalidator.validate("login"), usercontroller.login);

router.post("/forgetPassword", fieldvalidator.validate("forgetPassword"), usercontroller.forgetPassword);

router.post("/resetpassword", fieldvalidator.validate("resetPassword"), usercontroller.resetPassword);

router.post("/change-password", fieldvalidator.validate("changepassword"), checkuserauth, usercontroller.changepassword);

router.get("/activeuser", usercontroller.activeUser);

router.post("/user/update", multer(multerservice.multerconf).single('profilepic'), checkuserauth, appfieldvalidator.validate("updateUser"),
    usercontroller.updateProfile
);
router.get("/getstaticPages", usercontroller.getStaticPages)
router.post('/suggest-category', appfieldvalidator.validate("suggestcategory"), checkuserauth, usercontroller.suggestCategory);


//Route to restaurant services 

router.post("/rateRestaurant", appfieldvalidator.validate("rateRestaurant"), checkuserauth, restaurantcontroller.rateRestaurant);
router.post("/homepageRestaurant", appfieldvalidator.validate("homeRestaurant"), restaurantcontroller.homepageRestaurant);
router.post("/allpopular-restaurant", appfieldvalidator.validate("allRestaurant"), restaurantcontroller.Allmostpopular);
router.post("/allnewest-restaurant", appfieldvalidator.validate("allRestaurant"), restaurantcontroller.Allnewsest);
router.post("/restaurant-detail", appfieldvalidator.validate("restaurantdetail"), restaurantcontroller.restaurantDetail);
router.get("/get-categories", restaurantcontroller.getcategories);
router.get("/get-subcategories", restaurantcontroller.getsubcategories);
router.post("/category-search", appfieldvalidator.validate("categorysearch"), restaurantcontroller.categorySearch);

router.post("/getrestaurantbycat", appfieldvalidator.validate("getrestaurantbycat"), restaurantcontroller.getrestaurantbycat);
router.post("/getrestaurantbysubcat", appfieldvalidator.validate("getrestaurantbysubcat"), restaurantcontroller.getrestaurantbysubcat);
router.post("/filter-restaurant", appfieldvalidator.validate("filterRestaurant"), restaurantcontroller.filterRestaurant);
router.post("/restaurant/search", restaurantcontroller.searchRestaurant);
router.post("/restaurant/gallery", appfieldvalidator.validate("restaurantdetail"), restaurantcontroller.gallery);
router.post("/restaurant/review", appfieldvalidator.validate("restaurantdetail"), restaurantcontroller.getreview);
router.post("/restaurant/menu", appfieldvalidator.validate("restaurantdetail"), restaurantcontroller.menu);
router.post("/getadverts", appfieldvalidator.validate("homeRestaurant"), restaurantcontroller.getAdverts);


//Route to checkIn , Feed and friends
router.post("/checkin", multer(multerservice.multerconfForChekIn).single('pic'), checkuserauth, appfieldvalidator.validate("checkIn"), feedcontroller.checkIn);
router.post("/usercheckins", appfieldvalidator.validate("usercheckIn"), checkuserauth, feedcontroller.usercheckins);
router.post("/getappusers", appfieldvalidator.validate("getappusers"), checkuserauth, feedcontroller.getAppUser);
router.post("/send-friendrequest", appfieldvalidator.validate("friend-request"), checkuserauth, feedcontroller.sendFriendRequest);
router.post("/friend-requests", appfieldvalidator.validate("requests"), checkuserauth, feedcontroller.friendRequests);
router.post("/friend-request-action", appfieldvalidator.validate("friend-request-action"), checkuserauth, feedcontroller.friendRequestAction);
router.post("/myfriend-list", appfieldvalidator.validate("requests"), checkuserauth, feedcontroller.MyFriendList);
router.post("/feed", appfieldvalidator.validate("requests"), checkuserauth, feedcontroller.feed);
router.post("/share-feedback", appfieldvalidator.validate("sharefeedback"), checkuserauth, feedcontroller.shareFeedback);
router.post("/checkin-like", appfieldvalidator.validate("checkin-like"), checkuserauth, feedcontroller.checkinLike);
router.post("/checkin-unlike", appfieldvalidator.validate("checkin-like"), checkuserauth, feedcontroller.checkinUnlike);

router.post('/friend-detail', appfieldvalidator.validate("friend-detail"), checkuserauth, feedcontroller.friendDetail);
router.post('/search-contact', checkuserauth, feedcontroller.searchContact)
router.post('/getnotificationsforapp', appfieldvalidator.validate("requests"), checkuserauth, usercontroller.getnotificationsforapp)
//send notification
router.post('/sendnotification', feedcontroller.sendnotification);
router.get('/logout', checkuserauth, usercontroller.logout);
router.post('/contactus', appfieldvalidator.validate("contactus"), usercontroller.contactus);
router.get('/getsiteinfo', usercontroller.getsiteinfo);


//new apis

router.post('/get-menu', appfieldvalidator.validate('getmenu'), restaurantcontroller.getResMenu)
router.post('/add-address', checkuserauth, appfieldvalidator.validate('add-address'), usercontroller.addAddress)
router.post('/delete-address', checkuserauth, appfieldvalidator.validate('delete-address'), usercontroller.deleteAddress)
router.get('/get-address', checkuserauth, usercontroller.getaddress);
router.get('/get-orders', checkuserauth, usercontroller.getOrders);
router.post('/restaurant/claim', appfieldvalidator.validate('claimRes'), restaurantcontroller.claim)
router.post('/addtocart', checkuserauth, appfieldvalidator.validate('addtocart'), restaurantcontroller.addtocart);
router.get('/getcart', checkuserauth, restaurantcontroller.getcart);
router.get('/clearCart', checkuserauth, restaurantcontroller.clearCart);
router.get('/getreviewstatus', backendRestauraneCotroller.getreviewsstatus)
router.post('/placeorder', appfieldvalidator.validate('placeorder'), restaurantcontroller.placeOrder)
router.post('/createIntent', restaurantcontroller.createIntent)
router.post('/createFutureIntent', restaurantcontroller.chargeLaterIntent)


router.get('/faqs', usercontroller.getFaqs)
router.get('/getTaxs', usercontroller.getTaxs)
router.post('/getslots', checkuserauth, appfieldvalidator.validate('getslot'), usercontroller.getSlots);
router.post('/make-reservation', checkuserauth, appfieldvalidator.validate('make-reservation'), usercontroller.makeReservation)
router.get('/getuser-reservation', checkuserauth, usercontroller.getUserReservation);
router.post('/driverReg', multer(multerservice.multerconfFordriver).fields([
    { name: 'license', maxCount: 1 },
    { name: 'criminalRec', maxCount: 1 }]), appfieldvalidator.validate('driverReg'), usercontroller.DriverReg);
router.post('/ResReg', multer(multerservice.multerconfForResReg).array('resimg', 5), appfieldvalidator.validate('resreg'), usercontroller.ResReg);
router.get('/autosearch', restaurantcontroller.autoSearch)
router.post("/getOrderDetail", restaurantcontroller.getOrderDetail);
router.get("/getongoingOrders", checkuserauth, restaurantcontroller.getongoingOrders)
router.get('/getOrderStages', restaurantcontroller.getOrderStages)
router.get('/getDiscounts', restaurantcontroller.getDiscounts)
router.post('/getDiscountsWithinLocation', restaurantcontroller.getDiscountsWithinLocation)
router.post('/getTimeslots', restaurantcontroller.getTimeslots)
router.post('/cancelOrder', restaurantcontroller.cancelOrder)
router.post('/updateFavorite', restaurantcontroller.updateFavorite)
router.post('/createFoodstampCard', restaurantcontroller.createFoodstampCard)
router.post('/getFoodstampCards', restaurantcontroller.getFoodstampCards)

module.exports = router;
