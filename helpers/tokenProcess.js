const jwt = require('jsonwebtoken');
const translate = require('./translate');
const tokenConfig = require('../config/strategies').token;

const language = translate.language;

module.exports = {
  encode: function(payload) {
    return jwt.sign(payload, tokenConfig.secret, { expiresIn: tokenConfig.expiresIn });
  },
  decode: function(options) {
    if (!options || !options.secret) {
      throw new Error('Authenticate : secret should be set.');
    }
    return (function(req, res, next) {
      // Check header or url parameters or post parameters for token
      const token = req.body.token || req.query.token || req.headers['x-access-token'];
      // if there is no token
      if (!token) {
        return res.status(401).json({ success: false, message: translate[language].tokenNotFound });
      }
      // verifies secret and checks expiration then decode token
      jwt.verify(token, options.secret, function(err, decoded) {
        if (err) {
          if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: translate[language].tokenAuthFailed });
          }
          if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: translate[language].tokenExpired });
          }
        } else {
          // if everything is good, save to request for use in other routes
          req.decoded = decoded;
          next();
        }
      });
    });
  }
};
