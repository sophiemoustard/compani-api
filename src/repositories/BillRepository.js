const { ObjectID } = require('mongodb');
const moment = require('moment');

const Bill = require('../models/Bill');

exports.findAmountsGroupedByClient = async (companyId, customerId = null, dateMax = null) => {
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
  ]).option({ company: companyId });

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
]).option({ allCompanies: true });

exports.getBillsSlipList = async companyId => Bill.aggregate([
  { $match: { client: { $exists: true } } },
  {
    $group: {
      _id: { thirdPartyPayer: '$client', year: { $year: '$date' }, month: { $month: '$date' } },
      bills: { $push: '$$ROOT' },
      firstBill: { $first: '$$ROOT' },
    },
  },
  {
    $addFields: {
      netInclTaxes: {
        $reduce: {
          input: '$bills',
          initialValue: 0,
          in: { $add: ['$$value', '$$this.netInclTaxes'] },
        },
      },
      month: { $substr: [{ $dateToString: { date: '$firstBill.date', format: '%d-%m-%Y' } }, 3, -1] },
    },
  },
  {
    $lookup: {
      from: 'billslips',
      as: 'billSlip',
      let: { thirdPartyPayerId: '$_id.thirdPartyPayer', month: '$month' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ['$thirdPartyPayer', '$$thirdPartyPayerId'] }, { $eq: ['$month', '$$month'] }],
            },
          },
        },
      ],
    },
  },
  { $unwind: { path: '$billSlip' } },
  {
    $lookup: {
      from: 'thirdpartypayers',
      localField: '_id.thirdPartyPayer',
      foreignField: '_id',
      as: 'thirdPartyPayer',
    },
  },
  { $unwind: { path: '$thirdPartyPayer' } },
  {
    $project: {
      _id: '$billSlip._id',
      netInclTaxes: 1,
      thirdPartyPayer: { _id: 1, name: 1 },
      month: 1,
      number: '$billSlip.number',
    },
  },
]).option({ company: companyId });
