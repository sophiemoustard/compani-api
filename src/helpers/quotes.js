const moment = require('moment');
const Customer = require('../models/Customer');
const QuoteNumber = require('../models/QuoteNumber');

exports.getQuotes = async customerId => Customer.findOne(
  { _id: customerId, quotes: { $exists: true } },
  { identity: 1, quotes: 1 },
  { autopopulate: false }
).lean();

exports.getQuoteNumber = async company => QuoteNumber.findOneAndUpdate(
  { prefix: moment().format('MMYY'), company: company._id },
  {},
  { new: true, upsert: true, setDefaultsOnInsert: true }
).lean();

exports.formatQuoteNumber = (companyPrefixNumber, prefix, seq) =>
  `DEV-${companyPrefixNumber}${prefix}${seq.toString().padStart(5, '0')}`;

exports.createQuote = async (customerId, payload, credentials) => {
  const { company } = credentials;
  const number = await exports.getQuoteNumber(company);

  const customer = await Customer.findOneAndUpdate(
    { _id: customerId },
    {
      $push: {
        quotes: { ...payload, quoteNumber: exports.formatQuoteNumber(company.prefixNumber, number.prefix, number.seq) },
      },
    },
    { new: true, select: { identity: 1, quotes: 1 }, autopopulate: false }
  ).lean();
  number.seq += 1;
  await QuoteNumber.updateOne({ prefix: number.prefix, company: company._id }, { $set: { seq: number.seq } });

  return customer;
};
