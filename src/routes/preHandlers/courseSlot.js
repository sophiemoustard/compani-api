const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Course = require('../../models/Course');
const translate = require('../../helpers/translate');
const { checkAuthorization } = require('./courses.js');

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

const formatAndCheckAuthorization = async (courseId, credentials) => {
  const course = await Course.findById(courseId).lean();
  if (!course) throw Boom.notFound();
  const courseTrainerId = course.trainer ? course.trainer.toHexString() : null;
  const courseCompanyId = course.company ? course.company.toHexString() : null;

  checkAuthorization(courseTrainerId, courseCompanyId, credentials);
};

exports.authorizeCreate = async (req) => {
  try {
    const courseId = get(req, 'payload.courseId') || '';
    await formatAndCheckAuthorization(courseId, req.auth.credentials);

    const { startDate, endDate } = req.payload;
    if ((startDate && !endDate) || (!startDate && endDate)) throw Boom.badRequest();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeUpdate = async (req) => {
  try {
    const courseId = get(req, 'pre.courseSlot.courseId') || '';
    await formatAndCheckAuthorization(courseId, req.auth.credentials);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
