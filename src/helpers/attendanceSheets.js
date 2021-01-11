const omit = require('lodash/omit');
const get = require('lodash/get');
const moment = require('moment');
const AttendanceSheet = require('../models/AttendanceSheet');
const Course = require('../models/Course');
const User = require('../models/User');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');

exports.create = async (payload) => {
  let fileName = moment(payload.date).format('DD-MMMM-YYYY');
  if (payload.trainee) {
    const { identity } = await User.findOne({ _id: payload.trainee }).lean();
    fileName = UtilsHelper.formatIdentity(identity, 'FL');
  }
  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({
    fileName: `emargement_${fileName}`,
    file: payload.file,
  });
  const newAttendanceSheet = await AttendanceSheet.create({ ...omit(payload, 'file'), file: fileUploaded });
  await Course.updateOne({ _id: payload.course }, { $push: { attendanceSheets: newAttendanceSheet._id } });
};

exports.list = async (query) => {
  const course = await Course.findOne({ _id: query.course }).populate({ path: 'attendanceSheets' }).lean();
  return get(course, 'attendanceSheets', []);
};
