const { ObjectID } = require('mongodb');
const moment = require('../extensions/moment');
const Payment = require('../models/Payment');
const { PAYMENT, REFUND, CESU } = require('../helpers/constants');

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
        customer: { _id: 1, identity: 1, fundings: 1 },
        payments: 1,
      },
    },
  ]).option({ company: companyId });

  return paymentsAmounts;
};

exports.getTaxCertificatesPayments = async (taxCertificate, companyId) => {
  const startDate = moment(taxCertificate.year, 'YYYY').startOf('year').toDate();
  const endDate = moment(taxCertificate.year, 'YYYY').endOf('year').toDate();
  const { _id: customerId } = taxCertificate.customer;

  const paidPrice = await Payment.aggregate([
    {
      $match: {
        customer: customerId,
        client: { $exists: false },
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, docs: { $push: '$$ROOT' } } },
    {
      $addFields: {
        cesu: { $filter: { input: '$docs', as: 'doc', cond: { $eq: ['$$doc.type', CESU] } } },
        payments: {
          $filter: {
            input: '$docs',
            as: 'payment',
            cond: { $and: [{ $eq: ['$$payment.nature', PAYMENT] }, { $ne: ['$$payment.type', CESU] }] },
          },
        },
        refunds: { $filter: { input: '$docs', as: 'payment', cond: { $eq: ['$$payment.nature', REFUND] } } },
      },
    },
    {
      $addFields: {
        payments: {
          $reduce: { input: '$payments', initialValue: 0, in: { $add: ['$$value', '$$this.netInclTaxes'] } },
        },
        refunds: { $reduce: { input: '$refunds', initialValue: 0, in: { $add: ['$$value', '$$this.netInclTaxes'] } } },
        cesu: { $reduce: { input: '$cesu', initialValue: 0, in: { $add: ['$$value', '$$this.netInclTaxes'] } } },
      },
    },
    {
      $project: {
        paid: { $subtract: ['$payments', '$refunds'] },
        cesu: 1,
      },
    },
  ]).option({ company: companyId });

  return paidPrice[0];
};
