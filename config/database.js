require('./config');

// Load module
var mysql = require('mysql');
// Initialize pool
var pool = mysql.createPool({
    connectionLimit: 10,
    host: CONFIG.db.host,
    user: CONFIG.db.username,
    password: CONFIG.db.password,
    database: CONFIG.db.name,
    port: CONFIG.db.port
});

pool.getConnection((err, connection) => {
    if (err) {
        //console.log("err: ", err)
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.')
        }
    }
    if (connection) {
        //console.log("connected")
        connection.release()
    }
    return
})

require('mysql-queries').init({
    host: CONFIG.db.host,
    port: CONFIG.db.port,
    user: CONFIG.db.username,
    password: CONFIG.db.password,
    database: CONFIG.db.name
});
module.exports = pool;


