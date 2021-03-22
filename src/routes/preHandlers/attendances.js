const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Attendance = require('../../models/Attendance');
const { TRAINER, INTRA } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const User = require('../../models/User');

const isTrainerAuthorized = (loggedUserId, courseSlot) => {
  if (!UtilsHelper.areObjectIdsEquals(loggedUserId, courseSlot.course.trainer)) throw Boom.forbidden();

  return null;
};

exports.authorizeAttendancesGet = async (req) => {
  const courseSlotsQuery = req.query.courseSlot ? { _id: req.query.courseSlot } : { course: req.query.course };
  const courseSlots = await CourseSlot.find(courseSlotsQuery, { course: 1 })
    .populate({ path: 'course', select: 'trainer trainees company type' })
    .lean();

  const { credentials } = req.auth;
  const { course } = courseSlots[0];

  if (!get(credentials, 'role.vendor')) {
    if (course.type === INTRA) {
      if (!course.company) throw Boom.badData();

      if (!UtilsHelper.areObjectIdsEquals(get(credentials, 'company._id'), course.company)) throw Boom.forbidden();
    }
  }

  const isTrainerButNotCourseTainer = get(credentials, 'role.vendor.name') === TRAINER &&
    !UtilsHelper.areObjectIdsEquals(credentials._id, course.trainer);
  if (isTrainerButNotCourseTainer) throw Boom.forbidden();

  return courseSlots.map(cs => cs._id);
};

exports.authorizeAttendanceCreation = async (req) => {
  const attendance = await Attendance.countDocuments(req.payload);
  if (attendance) throw Boom.conflict();

  const courseSlot = await CourseSlot.findOne({ _id: req.payload.courseSlot }, { course: 1 })
    .populate({ path: 'course', select: 'trainer trainees type company' })
    .lean();
  if (!courseSlot) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER) isTrainerAuthorized(credentials._id, courseSlot);

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
  if (get(credentials, 'role.vendor.name') === TRAINER) isTrainerAuthorized(credentials._id, attendance.courseSlot);

  return null;
};
