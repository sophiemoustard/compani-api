const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { CompaniDate } = require('../../helpers/dates/companiDates');
const UtilsHelper = require('../../helpers/utils');
const Course = require('../../models/Course');
const AttendanceSheet = require('../../models/AttendanceSheet');
const { INTRA, TRAINER, DAY, INTRA_HOLDING } = require('../../helpers/constants');

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

  const loggedUserHasVendorRole = get(credentials, 'role.vendor');
  if (loggedUserHasVendorRole) return null;

  if (get(req.query, 'company')) {
    const loggedUserCompany = get(credentials, 'company._id');
    const isCompanyInCourse = UtilsHelper.doesArrayIncludeId(course.companies, req.query.company);
    const isLoggedUserInCompany = UtilsHelper.areObjectIdsEquals(loggedUserCompany, req.query.company);

    if (!isCompanyInCourse || !isLoggedUserInCompany) throw Boom.forbidden();
  } else {
    const hasHoldingRole = !!get(credentials, 'role.holding');
    const isLoggedUserInHolding = UtilsHelper
      .areObjectIdsEquals(get(req.query, 'holding'), get(credentials, 'holding._id'));
    const hasHoldingAccessToCourse = course.companies
      .some(company => UtilsHelper.doesArrayIncludeId(get(credentials, 'holding.companies') || [], company));
    if (!hasHoldingRole || !isLoggedUserInHolding || !hasHoldingAccessToCourse) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeAttendanceSheetCreation = async (req) => {
  const course = await Course
    .findOne({ _id: req.payload.course }, { archivedAt: 1, type: 1, slots: 1, trainees: 1, trainer: 1 })
    .populate('slots')
    .lean();
  if (course.archivedAt) throw Boom.forbidden();

  const { credentials } = req.auth;
  isTrainerAuthorized(course.trainer, credentials);

  if ([INTRA, INTRA_HOLDING].includes(course.type)) {
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
  const { credentials } = req.auth;

  const attendanceSheet = await AttendanceSheet
    .findOne({ _id: req.params._id })
    .populate({ path: 'course', select: 'archivedAt trainer' })
    .setOptions({ isVendorUser: !!get(credentials, 'role.vendor') })
    .lean();
  if (get(attendanceSheet, 'course.archivedAt')) throw Boom.forbidden();

  isTrainerAuthorized(get(attendanceSheet, 'course.trainer'), credentials);

  return attendanceSheet || Boom.notFound();
};
