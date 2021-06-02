var express = require("express");
var router = express.Router();
var ws = require('express-ws')(express);

//const WebSocket = require('ws');
//const wss = new WebSocket.Server({ port: 8001 });

var usercontroller = require("../controllers/backend/users/usercontroller");
var admincontroller = require("./../controllers/backend/admin/admincontroller");
var userrestaurant = require("./../controllers/backend/users/restaurant");
var adminrestaurant = require("./../controllers/backend/admin/restaurant");

var fieldvalidator = require("../middleware/validator");
var checkauth = require("../middleware/check-auth");
var checkadminauth = require("../middleware/check-authforadmin");
var multer = require('multer');
var multerservice = require("../services/multerServices");
const checkAuth = require("../middleware/check-auth");

// Route for editor
router.post("/editor/login", fieldvalidator.validate("login"), usercontroller.editorlogin);
router.post("/editor/refund", usercontroller.processRefund);
router.get("/editor/getEditorRestaurant", checkauth, usercontroller.getEditorRestaurant);

// Route for Website user
router.get('/user/dashboard', checkauth, usercontroller.dashboard);
router.post("/user/registration", fieldvalidator.validate("createUser"), usercontroller.registration);
router.post("/user/login", fieldvalidator.validate("login"), usercontroller.login);
router.post("/user/activeuser", usercontroller.activeUser);

router.post("/user/forgetPassword", fieldvalidator.validate("forgetPassword"), usercontroller.forgetpassword)
router.post("/user/update", checkauth, multer(multerservice.multerconf).single('profilepic'), fieldvalidator.validate("updateUser"), usercontroller.updateProfile);
router.post("/change-password", checkauth, fieldvalidator.validate("changepassword"), usercontroller.changepassword);
router.post("/user/createRestaurant", checkauth, multer(multerservice.multerconfForRestaurant).single('restaurantpic'), fieldvalidator.validate("createrestaurant"), userrestaurant.saveRestaurant)
router.post("/user/updateRestaurant", checkauth, multer(multerservice.multerconfForRestaurant).single('restaurantpic'), fieldvalidator.validate("createrestaurant"), userrestaurant.updateRestaurant)
router.get("/user/getcategories", checkauth, userrestaurant.getcategories);
router.get("/user/getUserinfo", checkauth, usercontroller.userinfo);

router.post("/user/getrestaurantlist", checkauth, userrestaurant.getrestaurantlist);
router.get("/user/getuserrestaurants", checkauth, userrestaurant.getuserrestaurants);
router.get("/user/getrestaurant", checkauth, userrestaurant.getrestaurant);
router.get("/user/getsubcategory", checkauth, userrestaurant.getsubcategory);
router.get("/user/getrestaurantgroups", checkauth, userrestaurant.getrestaurantgroups);
router.post("/user/changerestaurantStatus", checkauth, userrestaurant.changerestaurantStatus);
router.post("/user/creategroup", checkauth, multer(multerservice.multerconfForMenuItems).any(), userrestaurant.creategroup);
router.post("/user/deleteRestaurant", checkauth, userrestaurant.deleteRestaurant);
router.get("/user/getmenuGroup", checkauth, userrestaurant.getmenuGroup);
router.get("/user/deleteGroup", checkauth, userrestaurant.deleteGroup);

router.get('/user/getGroupCustomization', checkauth, userrestaurant.getGroupCustomization);
router.post('/user/save-customizations', checkauth, fieldvalidator.validate("savecustomization"), userrestaurant.saveCustomizations);
router.post('/user/getCustomizationDetail', checkauth, userrestaurant.getCustomizationDetail);
router.get("/user/deleteCustomization", checkauth, userrestaurant.deleteCustomization);

router.get("/user/promoAdvert", checkauth, userrestaurant.getPromoAdvert);
router.post("/user/addPromoAdvert", checkauth, multer(multerservice.multerconfForAdvert).single('advertPic'), fieldvalidator.validate("addPromoAdvert"), userrestaurant.addPromoAdvert);
router.post("/user/get-advertbyid", checkauth, fieldvalidator.validate("advertbyid"), userrestaurant.getadvertById);
router.post("/user/delete-advert", checkauth, fieldvalidator.validate("delete-advert"), userrestaurant.deleteAdvert);
router.post("/user/advert/status-change", checkauth, fieldvalidator.validate("changeadvertstatus"), userrestaurant.changeadvertstatus);


router.get("/user/promoVideo", checkauth, userrestaurant.getPromoVideo);
router.post("/user/addPromoVideo", checkauth, multer(multerservice.multerconfForPromoVideo).fields([
  { name: 'video', maxCount: 1 },
  { name: 'video_thumbnail', maxCount: 1 }
]), fieldvalidator.validate("addPromoAdvert"), userrestaurant.addPromoVideo);
router.post("/user/get-promovideobyid", checkauth, fieldvalidator.validate("advertbyid"), userrestaurant.getpromovideobyid);
router.post("/user/delete-promovideo", checkauth, fieldvalidator.validate("delete-advert"), userrestaurant.deletePromoVideo);
router.post("/user/promovideo/status-change", checkauth, fieldvalidator.validate("changeadvertstatus"), userrestaurant.changepromovideostatus);
router.post("/user/reviews", checkauth, fieldvalidator.validate("user-reviews"), userrestaurant.getuserreviews);
router.get("/user/reviewsstatus", checkauth, userrestaurant.getreviewsstatus);


router.post("/user/gallaryImage", checkauth, multer(multerservice.multerconfForgallery).any(), userrestaurant.galleryImages);
router.get("/user/getgallaryImage", checkauth, userrestaurant.getgalleryImages);
router.get('/user/deletegalleryImage', checkauth, userrestaurant.deletegallaryImage);
router.post('/user/sendmsg', checkauth, fieldvalidator.validate('sendmsgValidation'), usercontroller.sendgroupmsg);
router.get('/user/getnotifications', checkauth, usercontroller.getnotifications);
router.post('/user/getorders', checkauth, usercontroller.getOrders)
router.post('/user/order-detail', checkauth, usercontroller.orderDetail)
router.post('/user/changeorderstatus', checkauth, fieldvalidator.validate('changeorderstatus'), usercontroller.changeorderstatus)

router.post('/user/getReservation', checkauth, usercontroller.getReservation)
router.post('/user/getResTimeSlots', checkauth, userrestaurant.getResTimeSlots);
router.post('/user/addResslot', checkauth, userrestaurant.addResSlot);
router.post('/user/getResslot', checkauth, userrestaurant.getResSlot)
router.post('/user/getReservationDetail', checkauth, usercontroller.getReservationDetail)
router.post('/user/updateCookingTime', checkauth, userrestaurant.updateCookingTime)
router.post('/user/submitCat', checkAuth, userrestaurant.submitCat)

router.get("/user/getInvoiceImage", checkauth, userrestaurant.getInvoiceImage);

/******************************************Drivers Apis***************************************/
router.post('/user/usemenu', checkAuth, userrestaurant.usemenu)
router.post('/user/deleteallmenu', checkAuth, userrestaurant.deleteAllmenu)
router.post('/user/getDriverForOrder', checkauth, usercontroller.getDriverDetail)
router.post('/user/checkCodeOfDriver', checkAuth, fieldvalidator.validate('checkCodeOfDriver'), usercontroller.checkCodeOfDriver)
router.post('/user/uploadmenu', checkAuth, userrestaurant.uploadmenuExcel)
router.post('/user/uploadinvQua', checkAuth, userrestaurant.uploadinvQua)
router.post('/user/updatemenuItems', checkauth, userrestaurant.updatemenuItems);

router.post('/user/verifyUserCode', checkAuth, userrestaurant.verifyUserCode);
router.post('/user/updatePaymentStatus', checkAuth, userrestaurant.updatePaymentStatus)
router.post('/user/stop-searching', checkAuth, userrestaurant.stopSearching)
router.post('/user/save-discount', fieldvalidator.validate("savediscount"), checkAuth, userrestaurant.saveDiscount)
router.post('/user/get-discount', checkAuth, userrestaurant.getResDiscount)
router.post('/user/del-discount', checkAuth, userrestaurant.deldiscount)
router.post('/user/checkallowtoeditdiscount', checkAuth, userrestaurant.checkallowtoeditdiscount)
router.post('/user/updateOrder', checkAuth, userrestaurant.updateOrder)

/******************************************Drivers Apis***************************************/

router.post('/user/saveEditor', checkAuth, fieldvalidator.validate('save-editor'), userrestaurant.saveEditor)
router.get("/user/getEditors", checkauth, userrestaurant.getEditors);
router.get("/user/deleteEditor", checkauth, userrestaurant.deleteEditor);

//Route for Admin
router.get('/admin/dashboard', checkadminauth, admincontroller.dashboard);
router.post("/admin/login", fieldvalidator.validate("login"), admincontroller.login);
router.post("/admin/update", checkadminauth, multer(multerservice.multerconf).single('profilepic'), fieldvalidator.validate("updateUser"), admincontroller.updateProfile
);
router.post("/admin/updateUser", checkadminauth, multer(multerservice.multerconf).single('profilepic'), fieldvalidator.validate("updateUser"), admincontroller.updateUser
);
router.post("/admin/change-password", checkadminauth, fieldvalidator.validate("changepassword"), admincontroller.changepassword);

router.post("/admin/changeStatus", checkadminauth, admincontroller.changeStatus);
router.post("/admin/savecategory", checkadminauth, multer(multerservice.multerconfForCatimg).single('catimg'), fieldvalidator.validate("savecategory"), admincontroller.savecategory);
router.post("/admin/savesubcategory", checkadminauth, fieldvalidator.validate("savesubcategory"), admincontroller.savesubcategory);
router.post("/admin/deleteCat", checkadminauth, admincontroller.deleteCat);
router.post("/admin/deleteSubCat", checkadminauth, admincontroller.deleteSubCat);


router.get('/admin/staticPages', checkadminauth, admincontroller.pages);
router.post("/admin/createPage", checkadminauth, fieldvalidator.validate("createPage"), admincontroller.createPage);
router.get("/admin/getPagecontents", checkadminauth, admincontroller.pagecontent);
router.post("/admin/updatePage", checkadminauth, fieldvalidator.validate("updatePage"), admincontroller.updatePage);


router.post("/admin/userlist", checkadminauth, admincontroller.userlist);
router.get("/admin/getCategory", checkadminauth, admincontroller.getCategory);
router.get("/admin/getsubcategories", checkadminauth, admincontroller.getsubcategories);

router.post("/admin/getrestaurantlist", checkadminauth, adminrestaurant.getrestaurantlist);
router.get("/admin/getOwnerlist", checkadminauth, admincontroller.getOwnerlist)
router.post("/admin/changeOwner", fieldvalidator.validate('changeOwner'), checkadminauth, admincontroller.changeOwner)
router.post("/admin/changeOwnerPermission", checkadminauth, admincontroller.changeOwnerPermission);

router.get("/getrestaurantdetail", checkauth, adminrestaurant.getrestaurant);

router.post("/admin/changerestaurantStatus", checkadminauth, adminrestaurant.changerestaurantStatus);

router.post("/admin/userfeedback", checkadminauth, adminrestaurant.getuserFeedbacks);
router.post("/admin/category-suggestion", checkadminauth, adminrestaurant.getcategorySuggestion);
router.post("/admin/delete-catsuggestion", checkadminauth, admincontroller.deleteCatSuggestion);

router.get("/admin/deletereview", checkadminauth, adminrestaurant.deletereview);
router.get('/admin/deletefeedback', checkadminauth, admincontroller.deletefeedback);

router.post('/admin/get-adverts', checkadminauth, adminrestaurant.getAdverts);
router.post('/admin/change-advert-status', checkadminauth, adminrestaurant.changeAdvertsStatus);
router.post('/admin/get-advertvideo', checkadminauth, adminrestaurant.getAdvertvideo);
router.post('/admin/change-advertvideo-status', checkadminauth, adminrestaurant.changeAdvertVideoStatus);

router.post('/admin/sendmsg', checkadminauth, fieldvalidator.validate('sendmsgValidation'), admincontroller.sendgroupmsg);
router.get('/admin/getnotifications', checkadminauth, admincontroller.getnotifications);
router.post('/admin/updateSetting', checkadminauth, fieldvalidator.validate('updatesetting'), admincontroller.updateSetting);
router.post('/admin/getSetting', checkadminauth, admincontroller.getSetting)

router.post('/admin/getReservation', checkauth, admincontroller.getReservation)

router.post('/admin/getfaqlist', checkadminauth, admincontroller.getfaqlist);
router.post('/admin/addfaq', fieldvalidator.validate('addfaq'), checkadminauth, admincontroller.addfaq);
router.get('/admin/getfaq', checkadminauth, admincontroller.getfaqDetail)
router.get('/admin/deletefaq', checkadminauth, admincontroller.deletefaq)
router.post('/admin/getorders', checkadminauth, admincontroller.getOrders)

router.post('/admin/drivelist', checkadminauth, admincontroller.driverList)
router.get('/admin/drive', checkadminauth, admincontroller.driverDetail)
router.post('/admin/resreg', checkadminauth, admincontroller.getresRegList)
router.get('/admin/getresreg', checkadminauth, admincontroller.getresreg)
router.post('/admin/SetWebdata', multer(multerservice.multerconfforWebdata).single('pic'), checkadminauth, admincontroller.SetWebdata)
router.post('/admin/invoiceImages', multer(multerservice.multerconfforInvoiceImages).array("file[]", 12), checkadminauth, admincontroller.invoiceImages)


/**
 * The following code fragment exists for notifications by websocket, 
 * it does not work and I do not know why, 
 * implement a new version of websocket so leave this commented
 */
/*
router.ws('/user/getNewOrder', function (ws, req) {

  ws.on('message', async function (msg) {

    let data = JSON.parse(msg)
    ws.send(JSON.stringify(await userrestaurant.getneworders(data)))
  });
});
*/

/**
 * This is my implementation of the websocket for notifications, att Eli
 */
/*
wss.on('connection', ws => {
  console.log('\x1b[33m%s\x1b[0m', "WebSocket Connected");

  ws.on('message', async data => {
    ws.send(JSON.stringify(await userrestaurant.getneworders(data)))
  });

  ws.on('error', error => {
    console.log("error", error);
  });

  ws.on('close', ws => {
    console.log("Close Websocket");
  })
});
*/
/*************************************************************************** */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}





/******************************************Drivers Apis***************************************/

router.post("/admin/driverlist", checkadminauth, admincontroller.driverlists);
router.post("/admin/getDriverOrders", checkadminauth, admincontroller.getdriverOrders)
router.post("/admin/paydriver", checkadminauth, admincontroller.paydriver)
router.post("/admin/saveStripeAccount", checkadminauth, admincontroller.saveStripeAccount)
router.post("/admin/saveAthAccount", checkadminauth, admincontroller.saveAthAccount)


module.exports = router;
