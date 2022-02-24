const has = require('lodash/has');
const CourseBill = require('../models/CourseBill');

exports.list = async (course, credentials) => {
  const courseBills = await CourseBill
    .find({ course })
    .populate({ path: 'company', select: 'name' })
    .populate({ path: 'courseFundingOrganisation', select: 'name' })
    .setOptions({ isVendorUser: has(credentials, 'role.vendor') })
    .lean();

  return courseBills.map(bill => ({ ...bill, netInclTaxes: bill.mainFee.price * bill.mainFee.count }));
};

exports.create = async payload => CourseBill.create(payload);

exports.updateCourseBill = async (courseBillId, payload) => {
  const params = payload.courseFundingOrganisation === ''
    ? { $unset: { courseFundingOrganisation: '' } }
    : { $set: payload };

  await CourseBill.updateOne({ _id: courseBillId }, params);
};
