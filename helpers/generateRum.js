const crypto = require('crypto');

const generateRum = () => {
  const len = 30;
  const prefix = 'CO';
  return prefix.concat(crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase());
};

module.exports = { generateRum };
