const moment = require('moment');
const groupBy = require('lodash/groupBy');
const NumbersHelper = require('../helpers/numbers');
const Bill = require('../models/Bill');

exports.findAmountsGroupedByClient = async (companyId, customersIds, dateMax = null) => {
  const rules = [{ customer: { $in: customersIds } }];
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const bills = await Bill.aggregate([
    { $match: { $and: rules } },
    {
      $group: {
        _id: { tpp: { $ifNull: ['$thirdPartyPayer', null] }, customer: '$customer' },
        billedList: { $push: '$netInclTaxes' },
      },
    },
    { $lookup: { from: 'customers', localField: '_id.customer', foreignField: '_id', as: 'customer' } },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'thirdpartypayers', localField: '_id.tpp', foreignField: '_id', as: 'thirdPartyPayer' } },
    { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        customer: { _id: 1, identity: 1, payment: 1, fundings: 1 },
        thirdPartyPayer: { name: 1, _id: 1 },
        billedList: 1,
      },
    },
  ]).option({ company: companyId });

  return bills.map(bill => ({
    ...bill,
    billed: bill.billedList.reduce((acc, b) => NumbersHelper.add(acc, b), NumbersHelper.toString(0)),
  }));
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

exports.getBillsSlipList = async (companyId) => {
  const billsSlipList = await Bill.aggregate([
    { $match: { thirdPartyPayer: { $exists: true } } },
    {
      $group: {
        _id: { thirdPartyPayer: '$thirdPartyPayer', year: { $year: '$date' }, month: { $month: '$date' } },
        bills: { $push: '$$ROOT' },
        firstBill: { $first: '$$ROOT' },
      },
    },
    { $addFields: { month: { $substr: [{ $dateToString: { date: '$firstBill.date', format: '%d-%m-%Y' } }, 3, -1] } } },
    {
      $lookup: {
        from: 'billslips',
        as: 'billSlips',
        localField: '_id.thirdPartyPayer',
        foreignField: 'thirdPartyPayer',
      },
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
        thirdPartyPayer: { _id: 1, name: 1 },
        month: 1,
        bills: 1,
        number: '$billSlip.number',
      },
    },
  ]).option({ company: companyId });

  return billsSlipList.map(billSlip => ({
    ...billSlip,
    netInclTaxes: billSlip.bills.reduce((acc, b) => NumbersHelper.add(acc, b.netInclTaxes), NumbersHelper.toString(0)),
  }));
};

exports.getBillsFromBillSlip = async (billSlip, companyId) => {
  const query = {
    thirdPartyPayer: billSlip.thirdPartyPayer._id,
    date: {
      $gte: moment(billSlip.month, 'MM-YYYY').startOf('month').toDate(),
      $lte: moment(billSlip.month, 'MM-YYYY').endOf('month').toDate(),
    },
    company: companyId,
  };

  return Bill.find(query).populate({ path: 'customer', select: 'fundings identity' }).lean();
};
