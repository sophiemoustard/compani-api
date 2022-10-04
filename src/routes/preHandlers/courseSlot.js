const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Course = require('../../models/Course');
const Step = require('../../models/Step');
const Attendance = require('../../models/Attendance');
const translate = require('../../helpers/translate');
const { checkAuthorization } = require('./courses');
const { E_LEARNING, ON_SITE, REMOTE, INTRA } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const { CompaniDate } = require('../../helpers/dates/companiDates');

const { language } = translate;

exports.getCourseSlot = async (req) => {
  try {
    const courseSlot = await CourseSlot
      .findOne({ _id: req.params._id })
      .populate({ path: 'step', select: '_id type' })
      .lean();
    if (!courseSlot) throw Boom.notFound(translate[language].courseSlotNotFound);

    return courseSlot;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const canEditCourse = async (courseId) => {
  const course = await Course.findOne({ _id: courseId }, { archivedAt: 1, trainer: 1, type: 1, companies: 1 }).lean();
  if (!course) throw Boom.notFound();
  if (course.archivedAt) throw Boom.forbidden();

  return course;
};

const formatAndCheckAuthorization = async (courseId, credentials) => {
  const course = await canEditCourse(courseId);

  const courseTrainerId = get(course, 'trainer');
  const courseCompanyId = course.type === INTRA ? course.companies : [];

  checkAuthorization(credentials, courseTrainerId, courseCompanyId);
};

const checkPayload = async (courseSlot, payload) => {
  const { course: courseId, step } = courseSlot;
  const { startDate, endDate } = payload;
  const hasBothDates = !!(startDate && endDate);
  const hasOneDate = !!(startDate || endDate);
  if (hasOneDate) {
    if (!hasBothDates) throw Boom.badRequest();
    const sameDay = CompaniDate(startDate).isSame(endDate, 'day');
    const startDateBeforeEndDate = CompaniDate(startDate).isSameOrBefore(endDate);
    if (!(sameDay && startDateBeforeEndDate)) throw Boom.badRequest();
  }

  const course = await Course.findById(courseId, { subProgram: 1 })
    .populate({ path: 'subProgram', select: 'steps' })
    .lean();

  if (step.type === E_LEARNING) throw Boom.badRequest();
  if (!UtilsHelper.doesArrayIncludeId(course.subProgram.steps, step._id)) throw Boom.badRequest();
  if ((payload.address && step.type !== ON_SITE) || (payload.meetingLink && step.type !== REMOTE)) {
    throw Boom.badRequest();
  }
};

exports.authorizeCreate = async (req) => {
  try {
    const { course: courseId, step: stepId } = req.payload;
    await canEditCourse(courseId);

    const course = await Course.findById(courseId, { subProgram: 1 })
      .populate({ path: 'subProgram', select: 'steps' })
      .lean();
    const isStepElearning = await Step.countDocuments({ _id: stepId, type: E_LEARNING }).lean();

    if (isStepElearning) throw Boom.badRequest();
    if (!UtilsHelper.doesArrayIncludeId(course.subProgram.steps, stepId)) throw Boom.badRequest();

    return null;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeUpdate = async (req) => {
  try {
    const courseSlot = await CourseSlot
      .findOne({ _id: req.params._id }, { course: 1, step: 1 })
      .populate({ path: 'step', select: 'type' })
      .lean();
    if (!courseSlot) throw Boom.notFound(translate[language].courseSlotNotFound);

    const courseId = get(courseSlot, 'course') || '';
    await formatAndCheckAuthorization(courseId, req.auth.credentials);
    await checkPayload(courseSlot, req.payload);

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
      { _id: { $nin: [courseSlot._id] }, course: courseSlot.course, step: courseSlot.step._id },
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
