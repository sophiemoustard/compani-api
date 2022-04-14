const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseBill = require('../../models/CourseBill');
const Company = require('../../models/Company');
const { CompaniDate } = require('../../helpers/dates/companiDates');

exports.authorizeCourseCreditNoteCreation = async (req) => {
  const { company: companyId, courseBill: courseBillId, date } = req.payload;
  const { credentials } = req.auth;

  const companyExist = await Company.countDocuments({ _id: companyId });
  if (!companyExist) throw Boom.notFound();

  const courseBill = await CourseBill
    .findOne({ _id: courseBillId })
    .populate({ path: 'courseCreditNote', options: { isVendorUser: get(credentials, 'role.vendor') } })
    .lean();
  if (!courseBill) throw Boom.notFound();
  if (!courseBill.billedAt || courseBill.courseCreditNote || CompaniDate(date).isBefore(courseBill.billedAt)) {
    throw Boom.forbidden();
  }

  return null;
};
