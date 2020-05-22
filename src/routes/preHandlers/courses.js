
const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Course = require('../../models/Course');
const User = require('../../models/User');
const {
  TRAINER,
  INTRA,
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  COACH,
  TRAINING_ORGANISATION_MANAGER,
} = require('../../helpers/constants');
const translate = require('../../helpers/translate');

const { language } = translate;

const checkAuthorization = async (courseTrainerId, courseCompanyId, credentials) => {
  const userVendorRole = get(credentials, 'role.vendor.name');
  const userClientRole = get(credentials, 'role.client.name');
  const userCompanyId = credentials.company ? credentials.company._id.toHexString() : undefined;
  const userId = credentials._id;

  const isAdminVendor = userVendorRole === VENDOR_ADMIN;
  const isTOM = userVendorRole === TRAINING_ORGANISATION_MANAGER;
  const isTrainerAndAuthorized = userVendorRole === TRAINER && userId === courseTrainerId;
  const isClientAndAuthorized = (userClientRole === CLIENT_ADMIN || userClientRole === COACH)
    && userCompanyId === courseCompanyId;

  if (!isAdminVendor && !isTOM && !isTrainerAndAuthorized && !isClientAndAuthorized) throw Boom.forbidden();
};

exports.authorizeCourseEdit = async (req) => {
  try {
    const { credentials } = req.auth;
    const course = await Course.findOne({ _id: req.params._id }).lean();
    if (!course) throw Boom.notFound();

    const courseTrainerId = course.trainer ? course.trainer.toHexString() : undefined;
    const courseCompanyId = course.company ? course.company.toHexString() : undefined;
    await checkAuthorization(courseTrainerId, courseCompanyId, credentials);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeGetCourseList = async (req) => {
  const { credentials } = req.auth;

  const courseTrainerId = get(req, 'query.trainer');
  const courseCompanyId = get(req, 'query.company');
  await checkAuthorization(courseTrainerId, courseCompanyId, credentials);

  return null;
};

exports.getCourseTrainee = async (req) => {
  try {
    const { company, local } = req.payload;
    const course = await Course.findOne({ _id: req.params._id }).lean();

    const trainee = await User.findOne({ 'local.email': local.email }).lean();
    if (trainee) {
      if (trainee.company.toHexString() !== company) {
        const message = course.type === INTRA
          ? translate[language].courseTraineeNotFromCourseCompany
          : translate[language].companyUserConflict;
        throw Boom.conflict(message);
      }

      const courseTrainee = await Course.findOne({ _id: req.params._id, trainees: trainee._id }).lean();
      if (courseTrainee) throw Boom.conflict(translate[language].courseTraineeAlreadyExists);
    }

    return trainee;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
