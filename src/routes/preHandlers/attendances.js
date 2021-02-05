const Boom = require('@hapi/boom');
const CourseSlot = require('../../models/CourseSlot');
const Attendance = require('../../models/Attendance');
const { TRAINER } = require('../../helpers/constants');
const UtilsHelper = require('../../helpers/utils');
const { checkAuthorization } = require('./courses');

exports.checkAttendanceExists = async req => Attendance.countDocuments(req.payload);

exports.checkAttendances = async (req) => {
  const query = UtilsHelper.formatObjectIdsArray(req.query.courseSlots);
  const courseSlots = [];
  for (const cs of query) {
    courseSlots.push(await CourseSlot.findOne({ _id: cs }, { course: 1 })
      .populate({ path: 'course', select: '_id trainer company' })
      .lean());
  }
  const { course } = courseSlots[0];
  if (courseSlots.filter(courseSlot =>
    UtilsHelper.areObjectIdsEquals(courseSlot.course._id, course._id)).length !== courseSlots.length) {
    throw Boom.forbidden();
  }
  checkAuthorization(req.auth.credentials, course.trainer, course.company);

  return query;
};

exports.checkAttendanceAddition = async (req) => {
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
