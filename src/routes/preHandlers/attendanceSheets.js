const Boom = require('@hapi/boom');
const moment = require('moment');
const Course = require('../../models/Course');
const AttendanceSheet = require('../../models/AttendanceSheet');
const { INTRA } = require('../../helpers/constants');

exports.checkCourseType = async (req) => {
  const course = await Course.findOne({ _id: req.payload.course }).populate('slots');
  if (course.type === INTRA) {
    if (req.payload.trainee) return Boom.badRequest();
    const courseDates = course.slots.filter(slot => moment(slot.startDate).isSame(req.payload.date, 'day'));
    if (!courseDates.length) return Boom.forbidden();

    return null;
  }
  if (req.payload.date) return Boom.badRequest();
  if (!course.trainees.includes(req.payload.trainee)) return Boom.forbidden();

  return null;
};

exports.attendanceSheetExists = async (req) => {
  const attendanceSheet = await AttendanceSheet.findOne({ _id: req.params._id }).lean();

  return attendanceSheet || Boom.notFound();
};
