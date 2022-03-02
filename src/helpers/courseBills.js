const get = require('lodash/get');
const flat = require('flat');
const has = require('lodash/has');
const omit = require('lodash/omit');
const NumbersHelper = require('./numbers');
const CourseBill = require('../models/CourseBill');

exports.list = async (course, credentials) => {
  const courseBills = await CourseBill
    .find({ course })
    .populate({ path: 'company', select: 'name' })
    .populate({ path: 'courseFundingOrganisation', select: 'name' })
    .setOptions({ isVendorUser: has(credentials, 'role.vendor') })
    .lean();

  return courseBills.map(bill => ({
    ...bill,
    netInclTaxes: bill.billingItemList
      ? NumbersHelper.multiply(bill.mainFee.price, bill.mainFee.count)
      + bill.billingItemList
        .map(item => NumbersHelper.multiply(item.price, item.count))
        .reduce((acc, value) => acc + value, 0)
      : NumbersHelper.multiply(bill.mainFee.price, bill.mainFee.count),
  }));
};

exports.create = async payload => CourseBill.create(payload);

exports.updateCourseBill = async (courseBillId, payload) => {
  let payloadToSet = payload;
  let payloadToUnset = {};

  for (const key of ['courseFundingOrganisation', 'mainFee.description']) {
    if (get(payload, key) === '') {
      payloadToSet = omit(payloadToSet, key);
      payloadToUnset = { ...payloadToUnset, [key]: '' };
    }
  }

  await CourseBill.updateOne(
    { _id: courseBillId },
    {
      ...(Object.keys(payloadToSet).length && { $set: flat(payloadToSet, { safe: true }) }),
      ...(Object.keys(payloadToUnset).length && { $unset: payloadToUnset }),
    });
};

exports.addBillingItem = async (courseBillId, payload) => {
  await CourseBill.updateOne({ _id: courseBillId }, { $push: { billingItemList: payload } });
};
