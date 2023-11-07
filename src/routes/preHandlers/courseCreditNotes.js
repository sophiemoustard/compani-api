const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseBill = require('../../models/CourseBill');
const Company = require('../../models/Company');
const { CompaniDate } = require('../../helpers/dates/companiDates');
const CourseCreditNote = require('../../models/CourseCreditNote');
const UtilsHelper = require('../../helpers/utils');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } = require('../../helpers/constants');

exports.authorizeCourseCreditNoteCreation = async (req) => {
  const { companies: companiesIds, courseBill: courseBillId, date } = req.payload;
  const { credentials } = req.auth;

  const companiesCount = await Company.countDocuments({ _id: { $in: companiesIds } });
  if (companiesCount !== companiesIds.length) throw Boom.notFound();

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

exports.authorizeCreditNotePdfGet = async (req) => {
  const { credentials } = req.auth;
  const userVendorRole = get(credentials, 'role.vendor.name');
  const isAdminVendor = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(userVendorRole);

  const creditNote = await CourseCreditNote
    .findOne({ _id: req.params._id }, { company: 1, courseBill: 1 })
    .populate({ path: 'courseBill', select: 'payer' })
    .lean();

  if (!creditNote) throw Boom.notFound();

  if (!isAdminVendor) {
    const companyId = get(credentials, 'company._id');
    const hasSameCompany = UtilsHelper.areObjectIdsEquals(creditNote.company, companyId);
    const isPayer = UtilsHelper.areObjectIdsEquals(creditNote.courseBill.payer, companyId);
    if (!hasSameCompany && !isPayer) throw Boom.notFound();
  }

  return null;
};
