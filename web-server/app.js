

global.__base_dir = __dirname + '/';

var express = require('express');
var app = express();
var session = require('express-session');
var path = require("path");
var logger = require('morgan');
var bodyParser = require('body-parser');
var uuid = require('uuid');


var MySQLStore = require('express-mysql-session')(session);
app.use(logger('dev'));

//app.use(bodyParser.urlencoded({extended: true}));
//app.use(bodyParser.json());
var body_json_parser = bodyParser.json();

var env = process.env.NODE_ENV || "development";
var config = require(path.join(__dirname, '.', 'shared','config', 'database.json'))[env];
var options = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database
};
var session_store = new MySQLStore(options);

app.use(session({
    genid: function(req) {
               return uuid.v4() // use UUIDs for session IDs
           },
    secret: 'fuck show me the moneys',
    store: session_store,
    resave: true,
    saveUninitialized: true
}));

var auth_api_route = require('./routes/auth_api.js');
app.use('/', body_json_parser, auth_api_route);

var admin_api = require('./routes/admin_api.js');
app.use('/adminapi', body_json_parser, admin_api);

var pay_wechat = require('./routes/pay_wechat.js');
app.use('/pay_wechat', body_json_parser, pay_wechat);

var pay_iap = require('./routes/pay_iap.js');
app.use('/pay_iap', body_json_parser, pay_iap);

var pay_cb = require('./routes/pay_callback.js');
app.use('/pay_callback', bodyParser.text({ type : "text/*"}), pay_cb);

var dealer = require('./routes/dealer.js');
app.use('/dealer', body_json_parser, dealer);

app.use('/adminmj', express.static('admins'))

if (app.get('env') === 'development') {
  app.use(express.static(__dirname + '/public'));
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    console.log(err,err.message);

    /*
    res.render('error', {
      message: err.message,
      error: err
    });
    */
  });
}

// production error handler
// no stacktraces leaked to user
if (app.get('env') === 'production') {

    app.use(function(err, req, res, next) {
      var oneYear = 31557600000;
      app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
      res.status(err.status || 500);
      console.log(err,err.message);
      /*
      res.render('error', {
        message: err.message,
        error: {}
      });
      */
    });
}

module.exports = app;
