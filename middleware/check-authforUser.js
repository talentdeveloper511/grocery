var jwt = require("jsonwebtoken");
var config = require("./../config/config");

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decode = jwt.verify(token, config.jwt.encryption);
        userId = req.body.user_id ? req.body.user_id : req.query.user_id;

        if (decode.userid != userId)
            return res.status(401).json({
                status: 401,
                message: "Auth failed"
            });
        req.userData = decode;
        next();
    } catch (error) {

        return res.status(401).json({
            status: 401,
            message: "Auth failed"
        });
    }
};
