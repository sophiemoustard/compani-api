const moment = require('moment');
const flat = require('flat');

const translate = require('../helpers/translate');

const language = translate.language;

const Counter = require('../models/IdNumber');

const createNumber = async (req, res) => {
  try {
    const query = {
      idNumber: {
        prefix: `SA${moment().format('YYMM')}`
      }
    };
    const payload = {
      idNumber: { seq: 1 }
    };
    const number = await Counter.findOneAndUpdate(flat(query), { $inc: flat(payload) }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const idNumber = `${number.idNumber.prefix}-${number.idNumber.seq.toString().padStart(3, '0')}`;
    return res.status(200).json({ success: true, message: translate[language].idNumberCreated, data: { idNumber } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ success: false, message: translate[language].unexpectedBehavior });
  }
};

module.exports = { createNumber };
