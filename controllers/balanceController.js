const Boom = require('boom');
const moment = require('moment');
const { ObjectID } = require('mongodb');

const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const Payment = require('../models/Payment');
const { canBeWithdrawn, computePayments } = require('../helpers/balances');
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

    const creditNotesAggregation = await CreditNote.aggregate([
      { $match: rules.length === 0 ? {} : { $and: rules } },
      {
        $group: {
          _id: '$customer',
          refund: { $sum: '$inclTaxesCustomer' },
        }
      },
    ]);

    const paymentQueries = rules.length > 0 ? rules.reduce((acc, next) => Object.assign(acc, next)) : {};
    const payments = await Payment.find(paymentQueries).lean();

    const balances = billsAggregation.map((bill) => {
      if (!bill._id.tpp) {
        const correspondingCreditNote = creditNotesAggregation.find(cn => cn._id.toHexString() === bill._id.customer.toHexString());
        bill.billed -= correspondingCreditNote ? correspondingCreditNote.refund : 0;
      }
      bill.paid = computePayments(payments, bill._id);
      bill.balance = bill.paid - bill.billed;
      bill.toPay = canBeWithdrawn(bill) ? Math.abs(bill.balance) : 0;
      return bill;
    });

    return {
      message: translate[language].balancesFound,
      data: { balances },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list
};
