const get = require('lodash/get');
const flat = require('flat');
const has = require('lodash/has');
const omit = require('lodash/omit');
const NumbersHelper = require('./numbers');
const CourseBill = require('../models/CourseBill');
const CourseBillsNumber = require('../models/CourseBillsNumber');

exports.list = async (course, credentials) => {
  const courseBills = await CourseBill
    .find({ course })
    .populate({ path: 'company', select: 'name' })
    .populate({ path: 'courseFundingOrganisation', select: 'name' })
    .setOptions({ isVendorUser: has(credentials, 'role.vendor') })
    .lean();

  return courseBills.map((bill) => {
    const mainFeeTotal = NumbersHelper.multiply(bill.mainFee.price, bill.mainFee.count);
    const billingPurchaseTotal = bill.billingPurchaseList
      ? bill.billingPurchaseList
        .map(item => NumbersHelper.multiply(item.price, item.count))
        .reduce((acc, value) => acc + value, 0)
      : 0;

    return {
      ...bill,
      netInclTaxes: mainFeeTotal + billingPurchaseTotal,
    };
  });
};

exports.create = async payload => CourseBill.create(payload);

exports.updateCourseBill = async (courseBillId, payload) => {
  let formattedPayload = {};

  if (payload.billedAt) {
    const lastBillNumber = await CourseBillsNumber
      .findOneAndUpdate({}, { $inc: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .lean();

    formattedPayload = {
      $set: { billedAt: payload.billedAt, number: `FACT-${lastBillNumber.seq.toString().padStart(5, '0')}` },
    };
  } else {
    let payloadToSet = payload;
    let payloadToUnset = {};

    for (const key of ['courseFundingOrganisation', 'mainFee.description']) {
      if (get(payload, key) === '') {
        payloadToSet = omit(payloadToSet, key);
        payloadToUnset = { ...payloadToUnset, [key]: '' };
      }
    }

    formattedPayload = {
      ...(Object.keys(payloadToSet).length && { $set: flat(payloadToSet, { safe: true }) }),
      ...(Object.keys(payloadToUnset).length && { $unset: payloadToUnset }),
    };
  }

  await CourseBill.updateOne({ _id: courseBillId }, formattedPayload);
};

exports.addBillingPurchase = async (courseBillId, payload) => {
  await CourseBill.updateOne({ _id: courseBillId }, { $push: { billingPurchaseList: payload } });
};
