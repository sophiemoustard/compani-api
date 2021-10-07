const Boom = require('@hapi/boom');
const get = require('lodash/get');
const moment = require('moment');
const CourseSlot = require('../../models/CourseSlot');
const Course = require('../../models/Course');
const Step = require('../../models/Step');
const Attendance = require('../../models/Attendance');
const translate = require('../../helpers/translate');
const { checkAuthorization } = require('./courses');
const { E_LEARNING, ON_SITE, REMOTE } = require('../../helpers/constants');

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

  checkAuthorization(credentials, courseTrainerId, courseCompanyId);
};

const checkPayload = async (courseId, payload) => {
  const { startDate, endDate, step: stepId } = payload;
  const hasBothOrNeitherDates = (startDate && endDate) || (!startDate && !endDate);
  const sameDay = moment(startDate).isSame(endDate, 'day');
  const startDateBeforeEndDate = moment(startDate).isSameOrBefore(endDate);
  if (!(hasBothOrNeitherDates && sameDay && startDateBeforeEndDate)) throw Boom.badRequest();

  if (stepId) {
    const course = await Course.findById(courseId).populate({ path: 'subProgram', select: 'steps' }).lean();
    const step = await Step.findById(stepId).lean();

    if (step.type === E_LEARNING) throw Boom.badRequest();
    if (!course.subProgram.steps.map(s => s.toHexString()).includes(stepId)) throw Boom.badRequest();
    if ((payload.address && step.type !== ON_SITE) || (payload.meetingLink && step.type !== REMOTE)) {
      throw Boom.badRequest();
    }
  }
};

exports.authorizeCreate = async (req) => {
  try {
    const courseId = get(req, 'payload.course') || '';
    await formatAndCheckAuthorization(courseId, req.auth.credentials);
    await checkPayload(courseId, req.payload);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeUpdate = async (req) => {
  try {
    const courseId = get(req, 'pre.courseSlot.course') || '';
    await formatAndCheckAuthorization(courseId, req.auth.credentials);
    await checkPayload(courseId, req.payload);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeDeletion = async (req) => {
  try {
    const { courseSlot } = req.pre;

    await formatAndCheckAuthorization(courseSlot.course, req.auth.credentials);

    const attendanceExists = await Attendance.countDocuments({ courseSlot: courseSlot._id });
    if (attendanceExists) throw Boom.conflict(translate[language].attendanceExists);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
