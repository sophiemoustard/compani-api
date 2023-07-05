const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Course = require('../../models/Course');
const { VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, INTRA } = require('../../helpers/constants');

exports.authorizeGetCourseHistories = async (req) => {
  const { credentials } = req.auth;
  const courseId = req.query.course;
  const vendorRole = get(credentials, 'role.vendor.name');

  if (vendorRole) {
    if ([VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole)) return null;

    const isTrainer = await Course.countDocuments({ _id: courseId, trainer: credentials._id });
    if (isTrainer) return null;
  }

  const companies = get(credentials, 'role.holding')
    ? get(credentials, 'holding.companies')
    : [get(credentials, 'company._id')];
  const isIntraAndIncludesUserCompany = await Course
    .countDocuments({ _id: courseId, type: INTRA, companies: { $in: companies } });

  if (!isIntraAndIncludesUserCompany) throw Boom.forbidden();

  return null;
};
