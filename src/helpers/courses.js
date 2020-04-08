const get = require('lodash/get');
const Course = require('../models/Course');
const Role = require('../models/Role');
const User = require('../models/User');
const UsersHelper = require('./users');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const ZipHelper = require('./zip');
const TwilioHelper = require('./twilio');
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

exports.sendSMS = async (courseId, payload) => {
  const course = await Course.findById(courseId).lean();
  const trainees = await User.find({ _id: { $in: course.trainees } }).lean();
  const traineesWithPhoneNumber = trainees.filter(trainee => get(trainee, 'contact.phone'));

  const smsNotSent = [];
  for (const trainee of traineesWithPhoneNumber) {
    try {
      await TwilioHelper.send({ to: `+33${trainee.contact.phone.substring(1)}`, from: 'Compani', body: payload.body });
    } catch (e) {
      console.log(e);
      smsNotSent.push(trainee.identity);
    }
  }
  return smsNotSent;
};

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
