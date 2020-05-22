const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Course = require('../../models/Course');
const translate = require('../../helpers/translate');
const { TRAINER, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, CLIENT_ADMIN, COACH } =
  require('../../helpers/constants');

const { language } = translate;

exports.getCourseSlot = async (req) => {
  try {
    const courseSlot = await CourseSlot.findOne({ _id: req.params._id }).lean();
    if (!courseSlot) throw Boom.notFound(translate[language].courseSlotNotFound);

    return courseSlot;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const checkAuthorization = async (courseId, credentials) => {
  const course = await Course.findById(courseId).lean();
  if (!course) throw Boom.notFound();

  const courseTrainerId = course.trainer ? course.trainer.toHexString() : undefined;
  const courseCompanyId = course.company ? course.company.toHexString() : undefined;

  const userVendorRole = get(credentials, 'role.vendor.name');
  const userClientRole = get(credentials, 'role.client.name');
  const userCompanyId = credentials.company ? credentials.company._id.toHexString() : undefined;
  const userId = get(credentials, '_id');

  const isAdminVendor = userVendorRole === VENDOR_ADMIN;
  const isTOM = userVendorRole === TRAINING_ORGANISATION_MANAGER;
  const isTrainerAndAuthorized = userVendorRole === TRAINER && userId === courseTrainerId;
  const isClientAndAuthorized = (userClientRole === CLIENT_ADMIN || userClientRole === COACH)
    && userCompanyId === courseCompanyId;

  if (!isAdminVendor && !isTOM && !isTrainerAndAuthorized && !isClientAndAuthorized) throw Boom.forbidden();
};

exports.authorizeCreate = async (req) => {
  try {
    await checkAuthorization(req.payload.courseId, req.auth.credentials);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeUpdate = async (req) => {
  try {
    const { courseSlot } = req.pre;
    await checkAuthorization(courseSlot.courseId, req.auth.credentials);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
