const { ObjectID } = require('mongodb');

const Bill = require('../models/Bill');

exports.findAmountsGroupedByClient = async (customerId = null, dateMax = null) => {
  const rules = [];
  if (customerId) rules.push({ customer: new ObjectID(customerId) });
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const billsAmounts = await Bill.aggregate([
    { $match: rules.length === 0 ? {} : { $and: rules } },
    {
      $group: {
        _id: { tpp: { $ifNull: ['$client', null] }, customer: '$customer' },
        billed: { $sum: '$netInclTaxes' },
      },
    },
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
      $lookup: {
        from: 'thirdpartypayers',
        localField: '_id.tpp',
        foreignField: '_id',
        as: 'thirdPartyPayer',
      },
    },
    { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        customer: { _id: 1, identity: 1, payment: 1 },
        thirdPartyPayer: { name: 1, _id: 1 },
        billed: 1,
      },
    },
  ]);

  return billsAmounts;
};
