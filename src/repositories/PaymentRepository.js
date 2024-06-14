const moment = require('../extensions/moment');
const Payment = require('../models/Payment');
const { PAYMENT, REFUND, CESU } = require('../helpers/constants');
const NumbersHelper = require('../helpers/numbers');

exports.findAmountsGroupedByClient = async (companyId, customersIds, dateMax = null) => {
  const rules = [{ customer: { $in: customersIds } }];
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const paymentsAmounts = await Payment.aggregate([
    { $match: { $and: rules } },
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
  ]).option({ company: companyId });

  if (!paidPrice[0]) return { paid: 0, cesu: 0 };

  const payments = paidPrice[0].payments
    .reduce((acc, p) => NumbersHelper.add(acc, p.netInclTaxes), NumbersHelper.toString(0));
  const refunds = paidPrice[0].refunds
    .reduce((acc, r) => NumbersHelper.add(acc, r.netInclTaxes), NumbersHelper.toString(0));
  const cesuRefunds = paidPrice[0].cesuRefunds
    .reduce((acc, cR) => NumbersHelper.add(acc, cR.netInclTaxes), NumbersHelper.toString(0));
  const cesuPayments = paidPrice[0].cesuPayments
    .reduce((acc, cP) => NumbersHelper.add(acc, cP.netInclTaxes), NumbersHelper.toString(0));
  const paid = NumbersHelper.subtract(payments, refunds);
  const cesu = NumbersHelper.subtract(cesuPayments, cesuRefunds);

  return { _id: paidPrice[0]._id, paid, cesu };
};
