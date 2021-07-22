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
        _id: { customer: '$customer', tpp: { $ifNull: ['$thirdPartyPayer', null] } },
        payments: { $push: '$$ROOT' },
      },
    },
    { $lookup: { from: 'thirdpartypayers', localField: '_id.tpp', foreignField: '_id', as: 'thirdPartyPayer' } },
    { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'customers', localField: '_id.customer', foreignField: '_id', as: 'customer' } },
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
        thirdPartyPayer: { $exists: false },
        date: { $gte: startDate, $lte: endDate },
      },
    },
    { $group: { _id: null, docs: { $push: '$$ROOT' } } },
    {
      $addFields: {
        cesuPayments: {
          $filter: {
            input: '$docs',
            as: 'payment',
            cond: { $and: [{ $eq: ['$$payment.nature', PAYMENT] }, { $eq: ['$$payment.type', CESU] }] },
          },
        },
        cesuRefunds: {
          $filter: {
            input: '$docs',
            as: 'payment',
            cond: { $and: [{ $eq: ['$$payment.nature', REFUND] }, { $eq: ['$$payment.type', CESU] }] },
          },
        },
        payments: {
          $filter: {
            input: '$docs',
            as: 'payment',
            cond: { $and: [{ $eq: ['$$payment.nature', PAYMENT] }, { $ne: ['$$payment.type', CESU] }] },
          },
        },
        refunds: {
          $filter: {
            input: '$docs',
            as: 'payment',
            cond: { $and: [{ $eq: ['$$payment.nature', REFUND] }, { $ne: ['$$payment.type', CESU] }] },
          },
        },
      },
    },
    {
      $addFields: {
        payments: {
          $reduce: { input: '$payments', initialValue: 0, in: { $add: ['$$value', '$$this.netInclTaxes'] } },
        },
        refunds: { $reduce: { input: '$refunds', initialValue: 0, in: { $add: ['$$value', '$$this.netInclTaxes'] } } },
        cesuRefunds: {
          $reduce: { input: '$cesuRefunds', initialValue: 0, in: { $add: ['$$value', '$$this.netInclTaxes'] } },
        },
        cesuPayments: {
          $reduce: { input: '$cesuPayments', initialValue: 0, in: { $add: ['$$value', '$$this.netInclTaxes'] } },
        },
      },
    },
    {
      $project: {
        paid: { $subtract: ['$payments', '$refunds'] },
        cesu: { $subtract: ['$cesuPayments', '$cesuRefunds'] },
      },
    },
  ]).option({ company: companyId });

  return paidPrice[0];
};
