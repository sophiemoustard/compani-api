const Boom = require('boom');

const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const { canBeWithdrawn } = require('../helpers/balances');
const translate = require('../helpers/translate');

const { language } = translate;

const getBalanceByClient = async (req) => {
  try {
    const billsAggregation = await Bill.aggregate([
      {
        $group: {
          _id: { tpp: { $ifNull: ["$client", null] }, customer: '$customer' },
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
          customer: { identity: 1, payment: 1 },
          thirdPartyPayer: { name: 1 },
          billed: 1,
        }
      }
    ]);

    const creditNotesAggregation = await CreditNote.aggregate([
      {
        $group: {
          _id: '$customer',
          refund: { $sum: '$inclTaxesCustomer' },
        }
      },
    ]);

    const balances = billsAggregation.map(bill => {
      if (!bill._id.tpp) {
        const correspondingCreditNote = creditNotesAggregation.find(cn => cn._id.toHexString() === bill._id.customer.toHexString());
        bill.billed -= correspondingCreditNote ? correspondingCreditNote.refund : 0;
      }
      bill.paid = 0;
      bill.balance = bill.paid - bill.billed;
      bill.toPay = canBeWithdrawn(bill) ? Math.abs(bill.balance) : 0;
      return bill;
    })

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
  getBalanceByClient
};
