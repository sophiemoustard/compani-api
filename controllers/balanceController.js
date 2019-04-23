const Boom = require('boom');
const moment = require('moment');
const { ObjectID } = require('mongodb');

const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const Payment = require('../models/Payment');
const { getBalance } = require('../helpers/balances');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  const rules = [];
  if (req.query.customer) rules.push({ customer: new ObjectID(req.query.customer) });
  if (req.query.date) rules.push({ date: { $lt: moment(req.query.date).endOf('day').toISOString() } });

  try {
    const billsAggregation = await Bill.aggregate([
      { $match: rules.length === 0 ? {} : { $and: rules } },
      {
        $group: {
          _id: { tpp: { $ifNull: ['$client', null] }, customer: '$customer' },
          billed: { $sum: '$netInclTaxes' },
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id.customer',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'thirdpartypayers',
          localField: '_id.tpp',
          foreignField: '_id',
          as: 'thirdPartyPayer'
        }
      },
      { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          customer: { _id: 1, identity: 1, payment: 1 },
          thirdPartyPayer: { name: 1, _id: 1 },
          billed: 1,
        }
      }
    ]);

    const customerCreditNotesAggregation = await CreditNote.aggregate([
      { $match: rules.length === 0 ? {} : { $and: rules } },
      {
        $group: { _id: '$customer', refund: { $sum: '$inclTaxesCustomer' } }
      },
      {
        $project: { _id: 0, customer: '$_id', refund: 1 }
      }
    ]);

    const tppCreditNotesAggregation = await CreditNote.aggregate([
      { $match: rules.length === 0 ? {} : { $and: rules } },
      {
        $group: {
          _id: { TPP: '$thirdPartyPayer', CUSTOMER: '$customer' },
          refund: { $sum: '$inclTaxesTpp' },
        }
      },
      {
        $lookup: {
          from: 'thirdpartypayers',
          localField: '_id.TPP',
          foreignField: '_id',
          as: 'thirdPartyPayer'
        }
      },
      { $unwind: { path: '$thirdPartyPayer' } },
      {
        $project: {
          _id: 0,
          thirdPartyPayer: '$thirdPartyPayer._id',
          customer: '$_id.CUSTOMER',
          refund: 1,
        },
      }
    ]);

    const paymentQueries = rules.length > 0 ? rules.reduce((acc, next) => Object.assign(acc, next)) : {};
    const payments = await Payment.find(paymentQueries).lean();

    const balances = [];
    for (const bill of billsAggregation) {
      balances.push(getBalance(bill, customerCreditNotesAggregation, tppCreditNotesAggregation, payments));
    }

    const filteredBalances = balances.filter(client => client.balance !== 0);

    return {
      message: translate[language].balancesFound,
      data: { balances: filteredBalances },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
};
