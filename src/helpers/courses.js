const path = require('path');
const get = require('lodash/get');
const fs = require('fs');
const os = require('os');
const moment = require('moment');
const flat = require('flat');
const Course = require('../models/Course');
const Role = require('../models/Role');
const CourseSmsHistory = require('../models/CourseSmsHistory');
const UsersHelper = require('./users');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const ZipHelper = require('./zip');
const TwilioHelper = require('./twilio');
const DocxHelper = require('./docx');
const drive = require('../models/Google/Drive');
const { AUXILIARY } = require('./constants');

exports.createCourse = payload => (new Course(payload)).save();

exports.list = async query => Course.find(query).lean();

exports.getCourse = async courseId => Course.findOne({ _id: courseId })
  .populate('companies')
  .populate('program')
  .populate('slots')
  .populate('trainees')
  .populate('trainer')
  .lean();

exports.updateCourse = async (courseId, payload) =>
  Course.findOneAndUpdate({ _id: courseId }, { $set: flat(payload) }).lean();

exports.sendSMS = async (courseId, payload) => {
  const course = await Course.findById(courseId)
    .populate({ path: 'trainees', match: { 'contact.phone': { $exists: true } } })
    .lean();

  const promises = [];
  for (const trainee of course.trainees) {
    promises.push(TwilioHelper.send({
      to: `+33${trainee.contact.phone.substring(1)}`,
      from: 'Compani',
      body: payload.body,
    }));
  }
  promises.push(CourseSmsHistory.create({ type: payload.type, course: courseId, message: payload.body }));
  await Promise.all(promises);
};

exports.getSMS = async courseId => CourseSmsHistory.find({ course: courseId }).lean();

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

exports.formatCourseSlotsForPdf = (slot) => {
  const duration = moment.duration(moment(slot.endDate).diff(slot.startDate));

  return {
    address: get(slot, 'address.fullAddress') || null,
    date: moment(slot.startDate).format('DD/MM/YYYY'),
    startHour: moment(slot.startDate).format('HH:mm'),
    endHour: moment(slot.endDate).format('HH:mm'),
    duration: UtilsHelper.formatDuration(duration),
  };
};

exports.getCourseDuration = (slots) => {
  const duration = slots.reduce(
    (acc, slot) => acc.add(moment.duration(moment(slot.endDate).diff(slot.startDate))),
    moment.duration()
  );

  return UtilsHelper.formatDuration(duration);
};

exports.formatCourseForPdf = (course) => {
  const slots = course.slots ? [...course.slots].sort((a, b) => new Date(a.startDate) - new Date(b.startDate)) : [];

  const courseData = {
    name: course.name,
    company: course.companies[0].tradeName,
    slots: slots.map(exports.formatCourseSlotsForPdf),
    trainer: course.trainer ? UtilsHelper.formatIdentity(course.trainer.identity, 'FL') : '',
    firstDate: slots.length ? moment(slots[0].startDate).format('DD/MM/YYYY') : '',
    lastDate: slots.length ? moment(slots[slots.length - 1].startDate).format('DD/MM/YYYY') : '',
    duration: exports.getCourseDuration(slots),
  };

  return {
    trainees: course.trainees.map(trainee => ({
      traineeName: UtilsHelper.formatIdentity(trainee.identity, 'FL'),
      course: { ...courseData },
    })),
  };
};

exports.generateAttendanceSheets = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate('companies')
    .populate('slots')
    .populate('trainees')
    .populate('trainer')
    .lean();

  return {
    fileName: 'emargement.pdf',
    pdf: await PdfHelper.generatePdf(exports.formatCourseForPdf(course), './src/data/attendanceSheet.html'),
  };
};

exports.formatCourseForDocx = course => ({
  courseName: course.name.toUpperCase(),
  courseDuration: exports.getCourseDuration(course.slots),
});

exports.generateCompletionCertificates = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate('slots')
    .populate('trainees')
    .lean();

  const courseData = exports.formatCourseForDocx(course);
  const certificateTemplatePath = path.join(os.tmpdir(), 'certificate_template.docx');
  await drive.downloadFileById({
    fileId: process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID,
    tmpFilePath: certificateTemplatePath,
  });

  const fileListPromises = course.trainees.map(async (trainee) => {
    const traineeIdentity = UtilsHelper.formatIdentity(trainee.identity, 'FL');
    const filePath = await DocxHelper.createDocx(
      certificateTemplatePath,
      { ...courseData, traineeIdentity, date: moment().format('DD/MM/YYYY') }
    );

    return { name: `Attestation - ${traineeIdentity}.docx`, file: fs.createReadStream(filePath) };
  });

  return ZipHelper.generateZip('attestations.zip', await Promise.all(fileListPromises));
};
