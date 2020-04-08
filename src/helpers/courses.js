const Course = require('../models/Course');
const Role = require('../models/Role');
const UsersHelper = require('./users');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const ZipHelper = require('./zip');
const { AUXILIARY } = require('./constants');

exports.createCourse = payload => (new Course(payload)).save();

exports.list = async query => Course.find(query).lean();

exports.getCourse = async courseId => Course.findOne({ _id: courseId })
  .populate('companies')
  .populate('program')
  .populate('slots')
  .populate('trainees')
  .lean();

exports.updateCourse = async (courseId, payload) =>
  Course.findOneAndUpdate({ _id: courseId }, { $set: payload }).lean();

exports.addCourseTrainee = async (courseId, payload, trainee) => {
  let coursePayload;
  if (!trainee) {
    const auxiliaryRole = await Role.findOne({ name: AUXILIARY }, { _id: 1 }).lean();
    const newUser = await UsersHelper.createUser({ ...payload, role: auxiliaryRole._id });
    coursePayload = { trainees: newUser._id };
  } else {
    coursePayload = { trainees: trainee._id };
  }

  return Course.findOneAndUpdate({ _id: courseId }, { $addToSet: coursePayload }, { new: true }).lean();
};

exports.removeCourseTrainee = async (courseId, traineeId) =>
  Course.updateOne({ _id: courseId }, { $pull: { trainees: traineeId } }).lean();

exports.generateAttendanceSheets = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate('companies')
    .populate('program')
    .populate('slots')
    .populate('trainees')
    .lean();

  const fileList = [];
  for (const trainee of course.trainees) {
    const file = await PdfHelper.generatePdf({}, './src/data/attendanceSheet.html');
    fileList.push({ name: `${UtilsHelper.formatIdentity(trainee.identity, 'FL')}.pdf`, file });
  }

  return ZipHelper.generateZip('emargement.zip', fileList);
};
