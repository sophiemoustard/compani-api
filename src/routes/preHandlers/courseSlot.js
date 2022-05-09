const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Course = require('../../models/Course');
const Step = require('../../models/Step');
const Attendance = require('../../models/Attendance');
const translate = require('../../helpers/translate');
const { checkAuthorization } = require('./courses');
const { E_LEARNING, ON_SITE, REMOTE } = require('../../helpers/constants');
const { CompaniDate } = require('../../helpers/dates/companiDates');

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

const canEditCourse = async (courseId) => {
  const course = await Course.findById(courseId).lean();
  if (!course) throw Boom.notFound();
  if (course.archivedAt) throw Boom.forbidden();

  return course;
};

const formatAndCheckAuthorization = async (courseId, credentials) => {
  const course = await canEditCourse(courseId);

  const courseTrainerId = course.trainer ? course.trainer.toHexString() : null;
  const courseCompanyId = course.company ? course.company.toHexString() : null;

  checkAuthorization(credentials, courseTrainerId, courseCompanyId);
};

const checkPayload = async (courseId, payload) => {
  const { startDate, endDate, step: stepId } = payload;
  const hasBothDates = !!(startDate && endDate);
  const hasOneDate = !!(startDate || endDate);
  if (hasOneDate) {
    if (!hasBothDates) throw Boom.badRequest();
    const sameDay = CompaniDate(startDate).isSame(endDate, 'day');
    const startDateBeforeEndDate = CompaniDate(startDate).isSameOrBefore(endDate);
    if (!(sameDay && startDateBeforeEndDate)) throw Boom.badRequest();
  }

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
    const { course: courseId, step: stepId } = req.payload;
    await canEditCourse(courseId);

    if (stepId) {
      const course = await Course.findById(courseId).populate({ path: 'subProgram', select: 'steps' }).lean();
      const isStepElearning = await Step.countDocuments({ _id: stepId, type: E_LEARNING }).lean();

      if (isStepElearning) throw Boom.badRequest();
      if (!course.subProgram.steps.map(s => s.toHexString()).includes(stepId)) throw Boom.badRequest();
    }
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

    await canEditCourse(courseSlot.course);

    const courseStepHasOtherSlots = await CourseSlot.countDocuments(
      { _id: { $nin: [courseSlot._id] }, course: courseSlot.course, step: courseSlot.step },
      { limit: 1 }
    );
    if (!courseStepHasOtherSlots) throw Boom.forbidden();

    const attendanceExists = await Attendance.countDocuments({ courseSlot: courseSlot._id });
    if (attendanceExists) throw Boom.conflict(translate[language].attendanceExists);

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};
