const { ObjectID } = require('mongodb');
const moment = require('moment');

const Bill = require('../models/Bill');

exports.findAmountsGroupedByClient = async (companyId, customerId = null, dateMax = null) => {
  const rules = [{ company: new ObjectID(companyId) }];
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

exports.findBillsAndHelpersByCustomer = async () => Bill.aggregate([
  {
    $match: {
      createdAt: {
        $lt: moment().startOf('d').toDate(),
        $gte: moment().subtract(1, 'd').startOf('d').toDate(),
      },
      client: { $exists: false },
      sentAt: { $exists: false },
      shouldBeSent: true,
    },
  },
  { $group: { _id: '$customer', bills: { $addToSet: '$$ROOT' } } },
  {
    $lookup: {
      from: 'customers',
      localField: '_id',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer' } },
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: 'customers',
      as: 'helpers',
    },
  },
  {
    $project: {
      _id: 0,
      bills: 1,
      customer: { _id: 1, identity: 1 },
      helpers: { identity: 1, local: 1, company: 1 },
    },
  },
]);
