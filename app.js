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
var bodyparser = require("body-parser");
const expressValidator = require("express-validator");
// const { Socket } = require("dgram");
const checkAuth = require("./middleware/check-auth");


var app = express();
app.use(logger("dev"));
app.use(cookieParser());
app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));
app.use(expressValidator());
require('express-ws')(app);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
const port = normalizePort(CONFIG.app.port);



app.listen(port, () => console.log(`Example app listening on port! `+port));
//app.get("/", (req, res) => res.send("Hello World!"));

app.use(function (req, res, next) {
  // Website you wish to allow to connect
  if (process.env.NODE_ENV_HEADER === "local") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, content-type, Authorization, Content-Type"
  );
  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);
  // Pass to next layer of middleware
  next();
});



app.use(express.static(path.join(__dirname, "public")));

// var whitelist = ["http://localhost:4300", "http://example2.com"];
// var corsOptions = {
//   origin: function(origin, callback) {
//     if (whitelist.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   }
// };

app.use("/", backendApi);
app.use("/api", AppserviceApi);
app.use("/driver", DriverApi);

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });
// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  //console.log(err)
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    error: {
      message: err
    }
  });
});

module.exports = app;
