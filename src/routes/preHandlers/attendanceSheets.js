const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { CompaniDate } = require('../../helpers/dates/companiDates');
const UtilsHelper = require('../../helpers/utils');
const Course = require('../../models/Course');
const AttendanceSheet = require('../../models/AttendanceSheet');
const { INTRA, INTER_B2B, TRAINER, DAY } = require('../../helpers/constants');

const isTrainerAuthorized = (courseTrainer, credentials) => {
  const loggedUserId = get(credentials, '_id');
  const vendorRole = get(credentials, 'role.vendor');
  const loggedUserIsNotCourseTrainer = courseTrainer && !UtilsHelper.areObjectIdsEquals(loggedUserId, courseTrainer);

  if (get(vendorRole, 'name') === TRAINER && loggedUserIsNotCourseTrainer) throw Boom.forbidden();

  return null;
};

exports.authorizeAttendanceSheetsGet = async (req) => {
  const course = await Course.findOne({ _id: req.query.course }, { type: 1, companies: 1, trainer: 1 }).lean();
  if (!course) throw Boom.notFound();

  const { credentials } = req.auth;
  isTrainerAuthorized(course.trainer, credentials);

  const loggedUserCompany = get(credentials, 'company._id');
  const loggedUserHasVendorRole = get(credentials, 'role.vendor');
  if (loggedUserHasVendorRole) return null;

  if (!UtilsHelper.doesArrayIncludeId(course.companies, loggedUserCompany)) throw Boom.forbidden();

  return course.type === INTER_B2B ? loggedUserCompany : null;
};

exports.authorizeAttendanceSheetCreation = async (req) => {
  const course = await Course
    .findOne({ _id: req.payload.course }, { archivedAt: 1, type: 1, slots: 1, trainees: 1, trainer: 1 })
    .populate('slots')
    .lean();
  if (course.archivedAt) throw Boom.forbidden();

  const { credentials } = req.auth;
  isTrainerAuthorized(course.trainer, credentials);

  if (course.type === INTRA) {
    if (req.payload.trainee) throw Boom.badRequest();
    const isCourseSlotDate = course.slots.some(slot => CompaniDate(slot.startDate).isSame(req.payload.date, DAY));
    if (!isCourseSlotDate) throw Boom.forbidden();

    return null;
  }
  if (req.payload.date) throw Boom.badRequest();
  if (!course.trainees.some(t => UtilsHelper.areObjectIdsEquals(t, req.payload.trainee))) throw Boom.forbidden();

  return null;
};

exports.authorizeAttendanceSheetDeletion = async (req) => {
  const attendanceSheet = await AttendanceSheet
    .findOne({ _id: req.params._id })
    .populate({ path: 'course', select: 'archivedAt trainer' })
    .lean();
  if (get(attendanceSheet, 'course.archivedAt')) throw Boom.forbidden();

  const { credentials } = req.auth;
  isTrainerAuthorized(get(attendanceSheet, 'course.trainer'), credentials);

  return attendanceSheet || Boom.notFound();
};
