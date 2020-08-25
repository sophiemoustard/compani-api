const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Course = require('../../models/Course');
const User = require('../../models/User');
const {
  TRAINER,
  INTRA,
  INTER_B2B,
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  COACH,
  TRAINING_ORGANISATION_MANAGER,
} = require('../../helpers/constants');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.checkAuthorization = (credentials, courseTrainerId, courseCompanyId, traineeCompanyId = null) => {
  const userVendorRole = get(credentials, 'role.vendor.name');
  const userClientRole = get(credentials, 'role.client.name');
  const userCompanyId = credentials.company ? credentials.company._id.toHexString() : null;
  const userId = get(credentials, '_id');

  const isAdminVendor = userVendorRole === VENDOR_ADMIN;
  const isTOM = userVendorRole === TRAINING_ORGANISATION_MANAGER;
  const isTrainerAndAuthorized = userVendorRole === TRAINER && userId === courseTrainerId;
  const isClientAndAuthorized = (userClientRole === CLIENT_ADMIN || userClientRole === COACH) &&
    userCompanyId && (userCompanyId === courseCompanyId || userCompanyId === traineeCompanyId);

  if (!isAdminVendor && !isTOM && !isTrainerAndAuthorized && !isClientAndAuthorized) throw Boom.forbidden();
};

exports.authorizeCourseEdit = async (req) => {
  try {
    const { credentials } = req.auth;
    const course = await Course.findOne({ _id: req.params._id }).lean();
    if (!course) throw Boom.notFound();

    const courseTrainerId = course.trainer ? course.trainer.toHexString() : null;
    const courseCompanyId = course.company ? course.company.toHexString() : null;
    this.checkAuthorization(credentials, courseTrainerId, courseCompanyId);

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
  const traineeId = get(req, 'query.trainees');

  let traineeCompanyId = null;
  if (traineeId) {
    const trainee = await User.findOne({ _id: traineeId }).lean();
    traineeCompanyId = trainee.company._id.toHexString();
  }

  this.checkAuthorization(credentials, courseTrainerId, courseCompanyId, traineeCompanyId);

  return null;
};

exports.authorizeCourseGetByTrainee = async (req) => {
  try {
    const userId = get(req, 'auth.credentials._id');
    const course = await Course.findOne({ _id: req.params._id, trainees: userId }).lean();
    if (!course) throw Boom.forbidden();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.getCourseTrainee = async (req) => {
  try {
    const { payload } = req;
    const course = await Course.findOne({ _id: req.params._id }).lean();
    if (!course) throw Boom.notFound();

    const trainee = await User.findOne({ 'local.email': payload.local.email }).lean();
    if (trainee) {
      if (course.type === INTRA) {
        const traineeCompany = trainee.company ? trainee.company._id.toHexString() : null;
        const conflictBetweenCompanies = course.company._id.toHexString() !== traineeCompany;
        if (traineeCompany && conflictBetweenCompanies) {
          throw Boom.conflict(translate[language].courseTraineeNotFromCourseCompany);
        }
      } else if (course.type === INTER_B2B) {
        const missingPayloadCompany = !trainee.company && !payload.company;
        if (missingPayloadCompany) throw Boom.badRequest();
      }

      const traineeAlreadyRegistered = course.trainees.some(t => t.toHexString() === trainee._id.toHexString());
      if (traineeAlreadyRegistered) throw Boom.conflict(translate[language].courseTraineeAlreadyExists);
    } else {
      const missingFields = !payload.company || !get(payload, 'local.email') || !get(payload, 'identity.lastname');
      if (missingFields) throw Boom.badRequest();
    }

    return trainee;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
