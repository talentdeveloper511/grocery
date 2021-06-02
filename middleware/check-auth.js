var jwt = require("jsonwebtoken");
var config = require("./../config/config");

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decode = jwt.verify(token, config.jwt.encryption);

    userId = req.body.loggedInUser_Id ? req.body.loggedInUser_Id : req.query.loggedInUser_Id;

    if (userId && decode.userid == userId)
      req.userData = decode;
    else
      return res.status(401).json({
        status: 401,
        message: "Auth failed"
      });
    next();
  } catch (error) {

    return res.status(401).json({
      status: 401,
      message: "Auth failed"
    });
  }
};
