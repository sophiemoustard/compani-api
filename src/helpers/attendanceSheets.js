const AttendanceSheet = require('../models/AttendanceSheet');
const Course = require('../models/Course');

exports.create = async (payload) => {
  const newAttendanceSheet = await AttendanceSheet.create(payload);
  await Course.updateOne({ _id: payload.course }, { $push: { attendanceSheets: newAttendanceSheet._id } });
};

exports.list = async (query) => {
  const course = await Course.findOne({ _id: query.course }).populate({ path: 'attendanceSheets' }).lean();
  return course.attendanceSheets ? course.attendanceSheets : [];
};
