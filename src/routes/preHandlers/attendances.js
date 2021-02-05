const Boom = require('@hapi/boom');
const CourseSlot = require('../../models/CourseSlot');
const Attendance = require('../../models/Attendance');
const { TRAINER } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');

exports.checkAttendanceExists = async req => Attendance.countDocuments(req.payload);

exports.attendancesAreFromSameCourse = async (req) => {
  const courseSlotsIds = UtilsHelper.formatObjectIdsArray(req.query.courseSlots);
  const courseSlots = [];
  for (const cs of courseSlotsIds) courseSlots.push(await CourseSlot.findOne({ _id: cs }, { course: 1 }).lean());
  const courseId = courseSlots[0].course;
  if (courseSlots.filter(cs => UtilsHelper.areObjectIdsEquals(cs.course, courseId)).length !== courseSlots.length) {
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

  if (req.auth.credentials.role.vendor === TRAINER && req.auth.credentials._id !== courseSlot.course.trainer) {
    throw Boom.forbidden();
  }
  if (!courseSlot.course.trainees.map(t => t.toHexString()).includes(req.payload.trainee)) throw Boom.forbidden();

  return null;
};
