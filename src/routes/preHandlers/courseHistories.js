const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Course = require('../../models/Course');
const {
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  COACH,
  INTRA,
} = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');

exports.authorizeGetCourseHistories = async (req) => {
  const { credentials } = req.auth;
  const courseId = req.query.course;
  const clientRole = get(credentials, 'role.client.name');
  const vendorRole = get(credentials, 'role.vendor.name');

  if (vendorRole) {
    if ([VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(vendorRole)) return null;

    const isTrainer = await Course.countDocuments({ _id: courseId, trainer: credentials._id });
    if (isTrainer) return null;
  }

  if ([CLIENT_ADMIN, COACH].includes(clientRole)) {
    const course = await Course.findOne({ _id: courseId }, { type: 1, companies: 1 }).lean();

    if (course.type !== INTRA || !UtilsHelper.doesArrayIncludeId(course.companies, credentials.company._id)) {
      throw Boom.forbidden();
    }

    return null;
  }

  throw Boom.forbidden();
};
