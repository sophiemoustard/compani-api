const crypto = require('crypto');
const moment = require('moment');
const flat = require('flat');
const Counter = require('../models/Rum');

const generateRum = async () => {
  const query = {
    prefix: `R${moment().format('YYMM')}`,
  };
  const payload = { seq: 1 };
  const number = await Counter.findOneAndUpdate(
    flat(query),
    { $inc: flat(payload) },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const len = 20;
  const random = crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase();

  return `${number.prefix}${number.seq.toString().padStart(5, '0')}${random}`;
};

module.exports = { generateRum };
