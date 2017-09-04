require('dotenv').config();

require('./config/config.js');

const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
// const passport = require('passport');
// const session = require('express-session');

const router = express.Router();
const app = express();

// Db connection
require('./config/mongoose');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// To comment for PROD, allow to do distant requests (local browser...)
// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     next();
// });

// Logging requests
if (process.env.NODE_ENV == 'development') {
  app.use(morgan('dev'));
  app.use(cors());
}

// Maybe a future use...
app.use(cookieParser());

// Allows to parse application/x-www-form-urlencoded as json
app.use(bodyParser.urlencoded({ extended: false }));
// Allows to get POST requests body
app.use(bodyParser.json());

// Allows to use /public folder
app.use(express.static(path.join(__dirname, 'public')));
// Allows to use /public/apidoc folder
app.use(express.static(path.join(__dirname, 'public/apidoc')));

// Required to use passport
// require('./config/passport');
// app.use(passport.initialize());

// Routing
app.use(require('./routes/index'));
//app.use('*', require('./routes/index'));

// Error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   console.error(err.message + ' | ' + err.statusCode);
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//   if (err.statusCode === 404)
//     return res.status(404).sendFile('public/index.html', { root: __dirname });
// });

module.exports = app;
