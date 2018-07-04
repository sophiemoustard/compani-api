const jwt = require('jsonwebtoken');

const encode = (payload, expireTime) => jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: expireTime || '24h' });

module.exports = { encode };
