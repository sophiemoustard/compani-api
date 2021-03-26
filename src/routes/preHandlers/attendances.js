const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Attendance = require('../../models/Attendance');
const Course = require('../../models/Course');
const { TRAINER, INTRA, INTER_B2B } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const User = require('../../models/User');

const isTrainerAuthorized = (loggedUserId, trainer) => {
  if (!UtilsHelper.areObjectIdsEquals(loggedUserId, trainer)) throw Boom.forbidden();

  return null;
};

const authorizeUserWithoutVendorRole = (loggedUserCompany, course) => {
  if (course.type === INTRA) {
    if (!course.company) throw Boom.badData();

    if (!UtilsHelper.areObjectIdsEquals(loggedUserCompany, course.company)) throw Boom.forbidden();
  }

  if (course.type === INTER_B2B) {
    const companyTraineeInCourse = course.trainees.some(t =>
      UtilsHelper.areObjectIdsEquals(loggedUserCompany, t.company));
    if (!companyTraineeInCourse) throw Boom.forbidden();
  }
};

exports.authorizeAttendancesGet = async (req) => {
  const courseSlotsQuery = req.query.courseSlot ? { _id: req.query.courseSlot } : { course: req.query.course };
  const courseSlots = await CourseSlot.find(courseSlotsQuery, { course: 1 })
    .populate({
      path: 'course',
      select: 'trainer trainees company type',
      populate: { path: 'trainees', select: 'company' },
    })
    .lean();

  if (!courseSlots.length) throw Boom.notFound();

  if (req.query.course) {
    const courseExist = await Course.countDocuments({ _id: req.query.course });
    if (!courseExist) throw Boom.notFound();
  }

  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');
  const loggedUserHasVendorRole = get(credentials, 'role.vendor');
  const { course } = courseSlots[0];

  if (!loggedUserHasVendorRole) authorizeUserWithoutVendorRole(loggedUserCompany, course);

  if (get(credentials, 'role.vendor.name') === TRAINER) isTrainerAuthorized(credentials._id, course.trainer);

  return {
    courseSlotsIds: courseSlots.map(cs => cs._id),
    company: !loggedUserHasVendorRole ? loggedUserCompany : null,
  };
};

exports.authorizeAttendanceCreation = async (req) => {
  const attendance = await Attendance.countDocuments(req.payload);
  if (attendance) throw Boom.conflict();

  const courseSlot = await CourseSlot.findOne({ _id: req.payload.courseSlot }, { course: 1 })
    .populate({ path: 'course', select: 'trainer trainees type company' })
    .lean();
  if (!courseSlot) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER) isTrainerAuthorized(credentials._id, courseSlot.course.trainer);

  const { course } = courseSlot;
  if (course.type === INTRA) {
    if (!course.company) throw Boom.badData();

    const doesTraineeBelongToCompany = await User.countDocuments({ _id: req.payload.trainee, company: course.company });
    if (!doesTraineeBelongToCompany) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeAttendanceDeletion = async (req) => {
  const attendance = await Attendance.findOne({ _id: req.params._id }, { courseSlot: 1 })
    .populate({ path: 'courseSlot', select: 'course', populate: { path: 'course', select: 'trainer' } })
    .lean();
  if (!attendance) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER) {
    isTrainerAuthorized(credentials._id, attendance.courseSlot.course.trainer);
  }

  return null;
};
