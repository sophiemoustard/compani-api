const { ObjectID } = require('mongodb');
const moment = require('moment');
const groupBy = require('lodash/groupBy');
const Bill = require('../models/Bill');

exports.findAmountsGroupedByClient = async (companyId, customerId = null, dateMax = null) => {
  const rules = [];
  if (customerId) rules.push({ customer: new ObjectID(customerId) });
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const billsAmounts = await Bill.aggregate([
    { $match: rules.length === 0 ? {} : { $and: rules } },
    {
      $group: {
        _id: { tpp: { $ifNull: ['$thirdPartyPayer', null] }, customer: '$customer' },
        billed: { $sum: '$netInclTaxes' },
      },
    },
    { $lookup: { from: 'customers', localField: '_id.customer', foreignField: '_id', as: 'customer' } },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'thirdpartypayers', localField: '_id.tpp', foreignField: '_id', as: 'thirdPartyPayer' } },
    { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        customer: { _id: 1, identity: 1, payment: 1, fundings: 1, archivedAt: 1 },
        thirdPartyPayer: { name: 1, _id: 1 },
        billed: 1,
      },
    },
  ]).option({ company: companyId });

  return billsAmounts;
};

exports.findBillsAndHelpersByCustomer = async (date) => {
  const options = { allCompanies: true };

  const bills = await Bill
    .find({
      createdAt: {
        $lt: moment(date).startOf('d').toDate(),
        $gte: moment(date).subtract(1, 'd').startOf('d').toDate(),
      },
      thirdPartyPayer: { $exists: false },
      sentAt: { $exists: false },
      shouldBeSent: true,
    })
    .populate({
      path: 'customer',
      select: 'identity',
      populate: {
        path: 'helpers',
        populate: { path: 'user', select: 'local', populate: { path: 'company', select: 'company' }, options },
        options,
      },
      options,
    })
    .setOptions(options)
    .lean();

  return Object.values(groupBy(bills, b => b.customer._id))
    .map(g => ({ bills: g, customer: g[0].customer, helpers: g[0].customer.helpers }));
};

exports.getBillsSlipList = async companyId => Bill.aggregate([
  { $match: { thirdPartyPayer: { $exists: true } } },
  {
    $group: {
      _id: { thirdPartyPayer: '$thirdPartyPayer', year: { $year: '$date' }, month: { $month: '$date' } },
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
    $lookup: { from: 'billslips', as: 'billSlips', localField: '_id.thirdPartyPayer', foreignField: 'thirdPartyPayer' },
  },
  {
    $addFields: { billSlip: { $filter: { input: '$billSlips', as: 'bs', cond: { $eq: ['$$bs.month', '$month'] } } } },
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

exports.getBillsFromBillSlip = async (billSlip, companyId) => {
  const query = {
    thirdPartyPayer: billSlip.thirdPartyPayer,
    date: {
      $gte: moment(billSlip.month, 'MM-YYYY').startOf('month').toDate(),
      $lte: moment(billSlip.month, 'MM-YYYY').endOf('month').toDate(),
    },
    company: companyId,
  };

  return Bill.find(query).populate({ path: 'customer', select: 'fundings identity' }).lean();
};
