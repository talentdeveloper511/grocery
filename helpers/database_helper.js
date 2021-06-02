var pool = require('./../config/database');
var sqlclient = require('mysql-queries');

var database_helper = {
    runQuery: function (query) {
        return new Promise((resolve, reject) => {
            pool.query(query, function (err, result) {
                if (err) {
                    return resolve(err);
                }
                return resolve(result)
            })
        })
    },
    runMultiQuery: function (sqls, condition = {}) {
        return new Promise((resolve, reject) => {
            sqlclient.queries(sqls, '', condition, function (err, result) {
                if (!!err) {
                    return reject(err);
                }
                return resolve(result);
            });
        })
    }
}

module.exports = database_helper;
