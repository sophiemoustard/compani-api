const flat = require('flat');
const moment = require('moment');
const Customer = require('../models/Customer');
const QuoteNumber = require('../models/QuoteNumber');

exports.getQuotes = async customerId => Customer.findOne(
  { _id: customerId, quotes: { $exists: true } },
  { identity: 1, quotes: 1 },
  { autopopulate: false }
).lean();

exports.createQuote = async (customerId, payload) => {
  const number = await QuoteNumber.findOneAndUpdate(
    { quoteNumber: { prefix: `DEV${moment().format('MMYY')}` } },
    { $inc: flat({ quoteNumber: { seq: 1 } }) },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  const quoteNumber = `${number.quoteNumber.prefix}-${number.quoteNumber.seq.toString().padStart(3, '0')}`;

  return Customer.findOneAndUpdate(
    { _id: customerId },
    { $push: { quotes: { ...payload, quoteNumber } } },
    { new: true, select: { identity: 1, quotes: 1 }, autopopulate: false }
  ).lean();
};
