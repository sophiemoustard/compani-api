const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { CompaniDate } = require('../../helpers/dates/companiDates');
const UtilsHelper = require('../../helpers/utils');
const Course = require('../../models/Course');
const AttendanceSheet = require('../../models/AttendanceSheet');
const { INTRA, INTER_B2B } = require('../../helpers/constants');

exports.authorizeAttendanceSheetsGet = async (req) => {
  const course = await Course.findOne({ _id: req.query.course }).lean();
  if (!course) throw Boom.notFound();

  const { credentials } = req.auth;
  const loggedUserHasVendorRole = get(credentials, 'role.vendor');
  if (loggedUserHasVendorRole) return null;

  const loggedUserCompany = get(credentials, 'company._id');

  if (course.type === INTRA && !UtilsHelper.areObjectIdsEquals(loggedUserCompany, course.company)) {
    throw Boom.forbidden();
  }

  if (course.type === INTER_B2B) return loggedUserCompany;

  return null;
};

exports.authorizeAttendanceSheetCreation = async (req) => {
  const course = await Course.findOne({ _id: req.payload.course }).populate('slots').lean();

  if (course.archivedAt) throw Boom.forbidden();

  if (course.type === INTRA) {
    if (req.payload.trainee) return Boom.badRequest();
    const courseDates = course.slots.filter(slot => CompaniDate(slot.startDate).isSame(req.payload.date, 'day'));
    if (!courseDates.length) return Boom.forbidden();

    return null;
  }
  if (req.payload.date) return Boom.badRequest();
  if (!course.trainees.some(t => UtilsHelper.areObjectIdsEquals(t, req.payload.trainee))) return Boom.forbidden();

  return null;
};

exports.authorizeAttendanceSheetDeletion = async (req) => {
  const attendanceSheet = await AttendanceSheet
    .findOne({ _id: req.params._id })
    .populate({ path: 'course', select: 'archivedAt' })
    .lean();

  if (get(attendanceSheet, 'course.archivedAt')) throw Boom.forbidden();

  return attendanceSheet || Boom.notFound();
};
