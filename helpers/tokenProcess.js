const jwt = require('jsonwebtoken');
const translate = require('./translate');
const tokenConfig = require('../config/strategies').token;

const language = translate.language;

module.exports = {
  encode: (payload) => {
    return jwt.sign(payload, tokenConfig.secret, { expiresIn: tokenConfig.expiresIn });
  },
  decode: (options) => {
    if (!options || !options.secret) {
      throw new Error('Authenticate : secret should be set.');
    }
    // Return middleware Express callback
    return (req, res, next) => {
      // Check header or url parameters or post parameters for token
      const token = req.body.token || req.query.token || req.headers['x-access-token'];
      // if there is no token
      if (!token) {
        return res.status(401).json({ success: false, message: translate[language].tokenNotFound });
      }
      // verifies secret and checks expiration then decode token
      try {
        const payload = jwt.verify(token, options.secret);
        // if everything is good, save decoded payload to use it in other routes
        req.decoded = payload;
        next();
      } catch (e) {
        if (e.name === 'JsonWebTokenError') {
          return res.status(401).json({ success: false, message: translate[language].tokenAuthFailed });
        }
        if (e.name === 'TokenExpiredError') {
          return res.status(401).json({ success: false, message: translate[language].tokenExpired });
        }
      }
    };
  }
};
