const { ObjectID } = require('mongodb');

const Payment = require('../models/Payment');

exports.findAmountsGroupedByClient = async (companyId, customerId = null, dateMax = null) => {
  const rules = [];
  if (customerId) rules.push({ customer: new ObjectID(customerId) });
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const paymentsAmounts = await Payment.aggregate([
    { $match: rules.length === 0 ? {} : { $and: rules } },
    {
      $group: {
        _id: { customer: '$customer', tpp: { $ifNull: ['$client', null] } },
        payments: { $push: '$$ROOT' },
      },
    },
    {
      $lookup: {
        from: 'thirdpartypayers',
        localField: '_id.tpp',
        foreignField: '_id',
        as: 'thirdPartyPayer',
      },
    },
    { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'customers',
        localField: '_id.customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        thirdPartyPayer: { name: 1, _id: 1 },
        customer: { _id: 1, identity: 1 },
        payments: 1,
      },
    },
  ]).option({ company: companyId });

  return paymentsAmounts;
};
