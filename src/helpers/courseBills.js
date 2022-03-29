const get = require('lodash/get');
const flat = require('flat');
const has = require('lodash/has');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const NumbersHelper = require('./numbers');
const CourseBill = require('../models/CourseBill');
const CourseBillsNumber = require('../models/CourseBillsNumber');
const PdfHelper = require('./pdf');
const CourseBillPdf = require('../data/pdf/courseBilling/courseBill');
const { LIST } = require('./constants');
const { CompaniDate } = require('./dates/companiDates');

exports.getNetInclTaxes = (bill) => {
  const mainFeeTotal = NumbersHelper.multiply(bill.mainFee.price, bill.mainFee.count);
  const billingPurchaseTotal = bill.billingPurchaseList
    ? bill.billingPurchaseList.map(p => NumbersHelper.multiply(p.price, p.count)).reduce((acc, val) => acc + val, 0)
    : 0;

  return NumbersHelper.add(mainFeeTotal, billingPurchaseTotal);
};

const getTimeProgress = (course) => {
  const pastSlotsCount = course.slots.filter(slot => CompaniDate().isAfter(slot.startDate)).length;

  return pastSlotsCount / (course.slots.length + course.slotsToPlan.length);
};

const balance = async (company) => {
  const courseBills = await CourseBill
    .find({ company, billedAt: { $exists: true, $type: 'date' } })
    .populate({
      path: 'course',
      select: 'misc slots slotsToPlan subProgram',
      populate: [
        { path: 'slots' },
        { path: 'slotsToPlan' },
        { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
      ],
    })
    .lean();

  return courseBills.map(bill => ({
    progress: getTimeProgress(bill.course),
    netInclTaxes: exports.getNetInclTaxes(bill),
    ...omit(bill, ['course.slots', 'course.slotsToPlan']),
  }));
};

exports.list = async (query, credentials) => {
  if (query.action === LIST) {
    const courseBills = await CourseBill
      .find({ course: query.course })
      .populate({ path: 'company', select: 'name' })
      .populate({ path: 'courseFundingOrganisation', select: 'name' })
      .setOptions({ isVendorUser: has(credentials, 'role.vendor') })
      .lean();

    return courseBills.map(bill => ({ ...bill, netInclTaxes: exports.getNetInclTaxes(bill) }));
  }

  return balance(query.company);
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

exports.addBillingPurchase = async (courseBillId, payload) =>
  CourseBill.updateOne({ _id: courseBillId }, { $push: { billingPurchaseList: payload } });

exports.updateBillingPurchase = async (courseBillId, billingPurchaseId, payload) => CourseBill.updateOne(
  { _id: courseBillId, 'billingPurchaseList._id': billingPurchaseId },
  {
    $set: {
      'billingPurchaseList.$.price': payload.price,
      'billingPurchaseList.$.count': payload.count,
      ...(!!payload.description && { 'billingPurchaseList.$.description': payload.description }),
    },
    ...(get(payload, 'description') === '' && { $unset: { 'billingPurchaseList.$.description': '' } }),
  }
);

exports.deleteBillingPurchase = async (courseBillId, billingPurchaseId) => CourseBill.updateOne(
  { _id: courseBillId },
  { $pull: { billingPurchaseList: { _id: billingPurchaseId } } }
);

exports.generateBillPdf = async (billId) => {
  const bill = await CourseBill.findOne({ _id: billId })
    .populate({
      path: 'course',
      select: 'subProgram',
      populate: { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
    })
    .populate({ path: 'billingPurchaseList', select: 'billingItem', populate: { path: 'billingItem', select: 'name' } })
    .lean();

  const data = pick(bill, ['course', 'mainFee', 'billingPurchaseList']);
  const template = await CourseBillPdf.getPdfContent(data);
  const pdf = await PdfHelper.generatePdf(template);

  return { pdf, billNumber: bill.number };
};
