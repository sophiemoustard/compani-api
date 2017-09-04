const translate = require('./translate');

const language = translate.language;

exports.checkOgustToken = (req, res, next) => {
  // Check header for token
  const token = req.headers['x-ogust-token'];
  // if there is no token
  if (!token) {
    return res.status(401).json({ success: false, message: translate[language].tokenNotFound });
  }
  next();
};
