const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Attendance = require('../../models/Attendance');
const { TRAINER, INTRA } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const User = require('../../models/User');

exports.checkAttendanceExists = async req => Attendance.countDocuments(req.payload);

exports.trainerHasAccessToAttendances = async (req) => {
  const courseSlotsIds = [...new Set(UtilsHelper.formatObjectIdsArray(req.query.courseSlots))];
  const courseSlots = await CourseSlot.find({ _id: { $in: courseSlotsIds } }, { course: 1 })
    .populate({ path: 'course', select: 'trainer trainees' })
    .lean();

  if (courseSlots.length !== courseSlotsIds.length) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER &&
    !courseSlots.every(cs => UtilsHelper.areObjectIdsEquals(cs.course.trainer, credentials._id))) {
    throw Boom.forbidden();
  }

  return courseSlotsIds;
};

exports.authorizeTrainerAndCheckTrainees = async (req) => {
  if (await this.checkAttendanceExists(req)) throw Boom.conflict();

  const courseSlot = await CourseSlot.findOne({ _id: req.payload.courseSlot }, { course: 1 })
    .populate({ path: 'course', select: 'trainer trainees type company' })
    .lean();
  if (!courseSlot) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER &&
    !UtilsHelper.areObjectIdsEquals(credentials._id, courseSlot.course.trainer)) {
    throw Boom.forbidden();
  }

  const { course } = courseSlot;
  if (course.type === INTRA) {
    if (!course.company) throw Boom.badData();
    const companyTrainees = await User.find({ company: course.company }).lean();

    if (!companyTrainees.some(trainee => UtilsHelper.areObjectIdsEquals(trainee._id, req.payload.trainee))) {
      throw Boom.forbidden();
    }
  }

  return null;
};

exports.checkAttendanceExistsAndAuthorizeTrainer = async (req) => {
  const attendance = await Attendance.findOne({ _id: req.params._id }, { courseSlot: 1 })
    .populate({ path: 'courseSlot', select: 'course', populate: { path: 'course', select: 'trainer' } })
    .lean();
  if (!attendance) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER &&
    !UtilsHelper.areObjectIdsEquals(credentials._id, get(attendance, 'courseSlot.course.trainer'))) {
    throw Boom.forbidden();
  }
  return null;
};
