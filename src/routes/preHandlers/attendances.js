const Boom = require('@hapi/boom');
const get = require('lodash/get');
const CourseSlot = require('../../models/CourseSlot');
const Attendance = require('../../models/Attendance');
const { TRAINER } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');

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
    .populate({ path: 'course', select: 'trainer trainees' })
    .lean();
  if (!courseSlot) throw Boom.notFound();

  const { credentials } = req.auth;
  if (get(credentials, 'role.vendor.name') === TRAINER &&
    !UtilsHelper.areObjectIdsEquals(credentials._id, courseSlot.course.trainer)) {
    throw Boom.forbidden();
  }

  if (!courseSlot.course.trainees.map(t => t.toHexString()).includes(req.payload.trainee)) throw Boom.forbidden();

  return null;
};

exports.authorizeDeletion = async req => (await Attendance.countDocuments({ _id: req.params._id })
  ? null
  : Boom.notFound()
);
