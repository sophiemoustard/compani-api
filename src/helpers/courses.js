const path = require('path');
const get = require('lodash/get');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const fs = require('fs');
const os = require('os');
const moment = require('moment');
const flat = require('flat');
const Course = require('../models/Course');
const CourseSmsHistory = require('../models/CourseSmsHistory');
const { findCourseAndPopulate } = require('../repositories/CourseRepository');
const UsersHelper = require('./users');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const ZipHelper = require('./zip');
const TwilioHelper = require('./twilio');
const DocxHelper = require('./docx');
const drive = require('../models/Google/Drive');
const { INTRA, INTER_B2B } = require('../helpers/constants');

exports.createCourse = payload => (new Course(payload)).save();

exports.list = async (query) => {
  let courses = [];

  if (!query.company) courses = await findCourseAndPopulate(query);
  else {
    const intraCourse = await findCourseAndPopulate({ ...query, type: INTRA });
    const interCourse = await findCourseAndPopulate({ ...omit(query, ['company']), type: INTER_B2B }, true);

    courses = [
      ...intraCourse,
      ...interCourse
        .filter(course => course.companies.includes(query.company))
        .map(course => omit(course, ['companies'])),
    ];
  }

  return courses;
};

exports.getCourse = async courseId => Course.findOne({ _id: courseId })
  .populate({ path: 'company', select: '_id name' })
  .populate({ path: 'program', select: '_id name' })
  .populate('slots')
  .populate({
    path: 'trainees',
    select: '_id identity.firstname identity.lastname local.email company contact ',
    populate: { path: 'company', select: 'name' },
  })
  .populate({ path: 'trainer', select: '_id identity.firstname identity.lastname' })
  .lean();

exports.updateCourse = async (courseId, payload) =>
  Course.findOneAndUpdate({ _id: courseId }, { $set: flat(payload) }).lean();

exports.sendSMS = async (courseId, payload, credentials) => {
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
  promises.push(CourseSmsHistory.create({
    type: payload.type,
    course: courseId,
    message: payload.body,
    sender: credentials._id,
  }));
  await Promise.all(promises);
};

exports.getSMSHistory = async courseId => CourseSmsHistory.find({ course: courseId })
  .populate({ path: 'sender', select: 'identity' })
  .lean();

exports.addCourseTrainee = async (courseId, payload, trainee) => {
  let coursePayload;
  if (!trainee) {
    const newUser = await UsersHelper.createUser(payload);
    coursePayload = { trainees: newUser._id };
  } else {
    if (!trainee.company) {
      const updateUserPayload = pick(payload, 'company');
      await UsersHelper.updateUser(trainee._id, updateUserPayload, null);
    }
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
    slots: slots.map(exports.formatCourseSlotsForPdf),
    trainer: course.trainer ? UtilsHelper.formatIdentity(course.trainer.identity, 'FL') : '',
    firstDate: slots.length ? moment(slots[0].startDate).format('DD/MM/YYYY') : '',
    lastDate: slots.length ? moment(slots[slots.length - 1].startDate).format('DD/MM/YYYY') : '',
    duration: exports.getCourseDuration(slots),
    programName: get(course, 'program.name'),
  };

  return {
    trainees: course.trainees.map(trainee => ({
      traineeName: UtilsHelper.formatIdentity(trainee.identity, 'FL'),
      company: get(trainee, 'company.name') || '',
      course: { ...courseData },
    })),
  };
};

exports.generateAttendanceSheets = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate('company')
    .populate('slots')
    .populate({ path: 'trainees', populate: { path: 'company', select: 'name' } })
    .populate('trainer')
    .populate('program')
    .lean();

  return {
    fileName: 'emargement.pdf',
    pdf: await PdfHelper.generatePdf(exports.formatCourseForPdf(course), './src/data/attendanceSheet.html'),
  };
};

exports.formatCourseForDocx = course => ({
  duration: exports.getCourseDuration(course.slots),
  learningGoals: get(course, 'program.learningGoals') || '',
  programName: get(course, 'program.name').toUpperCase() || '',
  startDate: moment(course.slots[0].startDate).format('DD/MM/YYYY'),
  endDate: moment(course.slots[course.slots.length - 1].endDate).format('DD/MM/YYYY'),
});

exports.generateCompletionCertificates = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate('slots')
    .populate('trainees')
    .populate('program')
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
