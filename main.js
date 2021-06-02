require("./config/config");
var createError = require("http-errors");
var cors = require("cors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var multer = require('multer');
var logger = require("morgan");
var backendApi = require("./routes/backend_api");
var AppserviceApi = require("./routes/appservice_api");
var DriverApi = require('./routes/driver_api');
const bodyparser = require("body-parser");
const expressValidator = require("express-validator");
const checkAuth = require("./middleware/check-auth");
/** * * * * * * * * * * * * * * * * * * * *  * * * * * * * * */
const http = require('http')
const vhost = require('vhost')
const https = require('https')
const fs = require('fs')
const WebSocket = require('ws');
/** * * * * * * * * * * * * * * * * * * * *  * * * * * * * * */
var userrestaurant = require("./controllers/backend/users/restaurant");
/** * * * * * * * Definir funciones staticas * * * * * * *  */
const www = express.Router()
const main = express()
const app = require('./app')
/** * * * * * * * Definir funciones staticas * * * * * * *  */
main.use(bodyparser.json());
main.use(bodyparser.urlencoded({ extended: false }));
main.use(cors())
main.use(cookieParser());
main.use(cors());
main.use(bodyparser.json());
main.use(bodyparser.urlencoded({ extended: false }));
main.use(expressValidator());
/** Definir directorio estatico para front */
www.use(express.static(path.join(__dirname, 'www'), { index: false }))
/** * * * * * * * * * * * * * * * * * * * *  * * * * * * * * */
www.get('*', function (request, response) {
  response.sendFile('index.html', { root: __dirname + '/www/' })
})
/** -------------------------------------------------------- */

main.use(function (request, response, next) {
  (!request.secure) ? response.redirect('https://' + request.headers.host + request.url) : next()
})


main.use(vhost('api.migente.online', app))
main.use(vhost('migente.online', www))


/** * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * */
const SECUREPORT = 8000
const keyFile = fs.readFileSync('/etc/letsencrypt/live/migente.api.prueba-mi-sitio.xyz/privkey.pem')
const certFile = fs.readFileSync('/etc/letsencrypt/live/migente.api.prueba-mi-sitio.xyz/fullchain.pem')
const sslOptions = { key: keyFile, cert: certFile }

const httpsServer = https.createServer(sslOptions, main)

/** * * * * * * * * * * * * * * * * * * * *  * * * * * * * * * */

const wss = new WebSocket.Server({ "server": httpsServer });

wss.on('connection', function connection(ws) {
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

httpsServer.listen(SECUREPORT, function (err) {
  if (err) { console.log(err) }
  else { console.log("Migente listen secure port " + SECUREPORT) }
})

