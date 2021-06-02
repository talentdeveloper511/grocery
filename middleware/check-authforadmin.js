var jwt = require("jsonwebtoken");
var config = require("./../config/config");
var query_helper = require("../helpers/database_helper");

module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decode = jwt.verify(token, config.jwt.encryption);
        userId = req.body.loggedInUser_Id ? req.body.loggedInUser_Id : req.query.loggedInUser_Id;
        let sql = `SELECT role,status FROM users WHERE id = '${userId}'`;
        return await query_helper.runQuery(sql).then(response => {

            if (response[0].role == 'admin' && response[0].status == 1) {
                req.userData = decode;
                next();
            } else {
                return res.status(401).json({
                    message: "You are not authrize"
                });
            }
        });

    } catch (error) {

        return res.status(401).json({
            message: "Auth failed"
        });
    }
};
