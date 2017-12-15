const translate = require('./translate');

const language = translate.language;

module.exports = {
  checkRoles: roles => (req, res, next) => {
    if (!roles) {
      return next();
    }
    if (req.decoded.role === 'admin') {
      return next();
    }
    let roleIsAuthorized = false;
    if (roles.list) {
      for (let i = roles.list.length - 1; i > -1; i--) {
        if (req.decoded.role === roles.list[i]) {
          roleIsAuthorized = true;
        }
      }
    }
    if (roles.checkById && req.params._id == req.decoded._id) {
      roleIsAuthorized = true;
    }
    if (roleIsAuthorized === false) {
      return res.status(403).json({ success: false, message: translate[language].forbidden });
    }
    next();
  }
};
