const authService = require('../../../services/AuthService');
const login = async function (req, res) {
    return await (authService.authUser(req)).then(response => {
        res.send(response);
    });
}
module.exports.login = login;
