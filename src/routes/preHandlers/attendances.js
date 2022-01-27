const Boom = require('@hapi/boom');
const get = require('lodash/get');
const has = require('lodash/has');
const CourseSlot = require('../../models/CourseSlot');
const Course = require('../../models/Course');
const User = require('../../models/User');
const Attendance = require('../../models/Attendance');
const {
  TRAINER,
  INTRA,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  COACH,
} = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const UserCompany = require('../../models/UserCompany');

const isTrainerAuthorized = (loggedUserId, trainer) => {
  if (!UtilsHelper.areObjectIdsEquals(loggedUserId, trainer)) throw Boom.forbidden();

  return null;
};

const checkRole = (course, credentials) => {
  const loggedUserCompany = get(credentials, 'company._id');
  const loggedUserVendorRole = get(credentials, 'role.vendor.name');
  const loggedUserClientRole = get(credentials, 'role.client.name');

  const isCourseTrainer = loggedUserVendorRole === TRAINER &&
    UtilsHelper.areObjectIdsEquals(credentials._id, course.trainer);
  const isAdminVendor = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(loggedUserVendorRole);

  let isClientAndAuthorized;
  if (course.type === INTRA) {
    if (!course.company) throw Boom.badData();

    isClientAndAuthorized = [COACH, CLIENT_ADMIN].includes(loggedUserClientRole) &&
      UtilsHelper.areObjectIdsEquals(loggedUserCompany, course.company);
  } else {
    const traineeCompanies = course.trainees.map(trainee => trainee.company);
    isClientAndAuthorized = [COACH, CLIENT_ADMIN].includes(loggedUserClientRole) &&
      UtilsHelper.doesArrayIncludeId(traineeCompanies, loggedUserCompany);
  }

  if (!isClientAndAuthorized && !isAdminVendor && !isCourseTrainer) throw Boom.forbidden();

  return null;
};

exports.authorizeAttendancesGet = async (req) => {
  const courseSlotsQuery = req.query.courseSlot ? { _id: req.query.courseSlot } : { course: req.query.course };
  const courseSlots = await CourseSlot.find(courseSlotsQuery, { course: 1 })
    .populate({
      path: 'course',
      select: 'trainer trainees company type',
      populate: { path: 'trainees', select: 'company', populate: { path: 'company' } },
    })
    .lean();

  if (!courseSlots.length) throw Boom.notFound();

  const { credentials } = req.auth;
  const loggedUserCompany = get(credentials, 'company._id');
  const loggedUserHasVendorRole = get(credentials, 'role.vendor');
  const { course } = courseSlots[0];

  checkRole(course, credentials);

  return {
    courseSlotsIds: courseSlots.map(cs => cs._id),
    company: !loggedUserHasVendorRole ? loggedUserCompany : null,
  };
};

exports.authorizeUnsubscribedAttendancesGet = async (req) => {
  const { course: courseId, trainee: traineeId } = req.query;
  const { credentials } = req.auth;
  const loggedUserHasVendorRole = has(credentials, 'role.vendor');
  const loggedUserClientRole = get(credentials, 'role.client.name');
  const loggedUserVendorRole = get(credentials, 'role.vendor.name');

  if (!loggedUserHasVendorRole && [COACH, CLIENT_ADMIN].includes(loggedUserClientRole) && !req.query.company) {
    throw Boom.badRequest();
  }

  if (courseId) {
    const course = await Course.findOne({ _id: courseId })
      .populate({ path: 'trainees', select: 'company', populate: 'company' })
      .lean();
    if (!course) throw Boom.notFound();

    checkRole(course, credentials);
  }
  if (traineeId) {
    const trainee = await User.findOne({ _id: traineeId })
      .populate({ path: 'company' })
      .lean();
    if (!trainee) throw Boom.notFound();

    if (!loggedUserHasVendorRole && !UtilsHelper.areObjectIdsEquals(trainee.company, credentials.company)) {
      throw Boom.notFound();
    }

    if (loggedUserVendorRole === TRAINER) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeAttendanceCreation = async (req) => {
  const attendance = await Attendance.countDocuments(req.payload);
  if (attendance) throw Boom.conflict();

  const courseSlot = await CourseSlot.findOne({ _id: req.payload.courseSlot }, { course: 1 })
    .populate({ path: 'course', select: 'trainer trainees type company archivedAt' })
    .lean();
  if (!courseSlot) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER) isTrainerAuthorized(credentials._id, courseSlot.course.trainer);

  const { course } = courseSlot;
  if (course.archivedAt) throw Boom.forbidden();
  if (course.type === INTRA) {
    if (!course.company) throw Boom.badData();

    const doesTraineeBelongToCompany = await UserCompany.countDocuments({
      user: req.payload.trainee,
      company: course.company,
    });
    if (!doesTraineeBelongToCompany) throw Boom.notFound();
  }

  return null;
};

exports.authorizeAttendanceDeletion = async (req) => {
  const attendance = await Attendance.findOne({ _id: req.params._id }, { courseSlot: 1 })
    .populate({ path: 'courseSlot', select: 'course', populate: { path: 'course', select: 'trainer archivedAt' } })
    .lean();
  if (!attendance) throw Boom.notFound();

  const { course } = attendance.courseSlot;
  if (course.archivedAt) throw Boom.forbidden();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER) {
    isTrainerAuthorized(credentials._id, attendance.courseSlot.course.trainer);
  }

  return null;
};
