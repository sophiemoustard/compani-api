const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Course = require('../../models/Course');
const TrainingContract = require('../../models/TrainingContract');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeTrainingContractUpload = async (req) => {
  const { course: courseId, company } = req.payload;
  const course = await Course.countDocuments({ _id: courseId, companies: company });
  if (!course) throw Boom.notFound();

  const trainingContractAlreadyExists = await TrainingContract.countDocuments({ course: courseId, company });
  if (trainingContractAlreadyExists) throw Boom.forbidden(translate[language].trainingContractAlreadyExists);

  return null;
};

exports.authorizeTrainingContractGet = async (req) => {
  const { course: courseId } = req.query;
  const { credentials } = req.auth;
  const isVendorUser = !!get(credentials, 'role.vendor');
  const company = get(credentials, 'company._id');

  const course = await Course.countDocuments({ _id: courseId, ...(!isVendorUser && { companies: company }) });

  if (!course) throw Boom.notFound();

  return null;
};

exports.authorizeTrainingContractDeletion = async (req) => {
  const { credentials } = req.auth;

  const trainingContract = await TrainingContract
    .findOne({ _id: req.params._id })
    .populate({ path: 'course', select: 'archivedAt' })
    .setOptions({ isVendorUser: !!get(credentials, 'role.vendor') })
    .lean();

  if (!trainingContract) throw Boom.notFound();
  if (get(trainingContract, 'course.archivedAt')) throw Boom.forbidden();

  return null;
};
