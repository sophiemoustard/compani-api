const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Course = require('../../models/Course');
const translate = require('../../helpers/translate');
const { TRAINER } = require('../../helpers/constants');

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

  const userRole = get(credentials, 'role.vendor.name');
  if (userRole === TRAINER && course.trainer.toHexString() !== credentials._id) throw Boom.forbidden();
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
