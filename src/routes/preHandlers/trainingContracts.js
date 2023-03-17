const Boom = require('@hapi/boom');
const Course = require('../../models/Course');
const UtilsHelper = require('../../helpers/utils');

exports.authorizeTrainingContractUpload = async (req) => {
  const course = await Course.findOne({ _id: req.payload._id }, { companies: 1 }).lean();

  if (!course) throw Boom.notFound();
  if (UtilsHelper.doesArrayIncludeId(course.companies, req.payload.company)) throw Boom.forbidden();

  return null;
};
