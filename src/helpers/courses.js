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
const CourseRepository = require('../repositories/CourseRepository');
const UsersHelper = require('./users');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const ZipHelper = require('./zip');
const TwilioHelper = require('./twilio');
const DocxHelper = require('./docx');
const drive = require('../models/Google/Drive');
const { INTRA, INTER_B2B } = require('./constants');

exports.createCourse = payload => (new Course(payload)).save();

exports.list = async (query) => {
  if (query.trainees) {
    return Course.find(query, { misc: 1 })
      .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } })
      .populate({ path: 'slots', select: 'startDate endDate' })
      .populate({ path: 'slotsToPlan', select: '_id' })
      .lean();
  }
  if (query.company) {
    const intraCourse = await CourseRepository.findCourseAndPopulate({ ...query, type: INTRA });
    const interCourse = await CourseRepository.findCourseAndPopulate(
      { ...omit(query, ['company']), type: INTER_B2B },
      true
    );

    return [
      ...intraCourse,
      ...interCourse.filter(course => course.companies.includes(query.company))
        .map(course => ({
          ...omit(course, ['companies']),
          trainees: course.trainees.filter(t => query.company === t.company._id.toHexString()),
        })),
    ];
  }
  return CourseRepository.findCourseAndPopulate(query);
};

exports.listUserCourses = async credentials => Course.find({ trainees: credentials._id })
  .populate({ path: 'subProgram', select: 'program steps', populate: { path: 'program', select: 'name image' } })
  .populate({ path: 'slots', select: 'startDate endDate step', populate: { path: 'step', select: 'type' } })
  .select('_id')
  .lean();

exports.getCourse = async (courseId, loggedUser) => {
  const userHasVendorRole = !!get(loggedUser, 'role.vendor');
  const userCompanyId = get(loggedUser, 'company._id') || null;
  // A coach/client_admin is not supposed to read infos on trainees from other companies
  // espacially for INTER_B2B courses.
  const traineesCompanyMatch = userHasVendorRole ? {} : { company: userCompanyId };

  return Course.findOne({ _id: courseId })
    .populate({ path: 'company', select: 'name' })
    .populate({
      path: 'subProgram',
      select: 'program steps',
      populate: [{ path: 'program', select: 'name learningGoals' }, { path: 'steps', select: 'name type' }],
    })
    .populate({ path: 'slots', populate: { path: 'step', select: 'name' } })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .populate({
      path: 'trainees',
      match: traineesCompanyMatch,
      select: 'identity.firstname identity.lastname local.email company contact ',
      populate: { path: 'company', select: 'name' },
    })
    .populate({ path: 'trainer', select: 'identity.firstname identity.lastname' })
    .lean();
};

exports.getCoursePublicInfos = async courseId => Course.findOne({ _id: courseId })
  .populate({
    path: 'subProgram',
    select: 'program',
    populate: { path: 'program', select: 'name learningGoals' },
  })
  .populate('slots')
  .populate({ path: 'slotsToPlan', select: '_id' })
  .populate({ path: 'trainer', select: 'identity.firstname identity.lastname biography' })
  .lean();

exports.getTraineeCourse = async courseId => Course.findOne({ _id: courseId })
  .populate({
    path: 'subProgram',
    select: 'program steps',
    populate: [{ path: 'program', select: 'name image' }, { path: 'steps', select: 'name type' }],
  })
  .populate({ path: 'slots', select: 'startDate endDate step address' })
  .select('_id')
  .lean();

exports.updateCourse = async (courseId, payload) =>
  Course.findOneAndUpdate({ _id: courseId }, { $set: flat(payload) }).lean();

exports.sendSMS = async (courseId, payload, credentials) => {
  const course = await Course.findById(courseId)
    .populate({ path: 'trainees', select: '_id contact' })
    .lean();

  const promises = [];
  const missingPhones = [];
  for (const trainee of course.trainees) {
    if (!get(trainee, 'contact.phone')) missingPhones.push(trainee._id);
    else {
      promises.push(TwilioHelper.send({
        to: `+33${trainee.contact.phone.substring(1)}`,
        from: 'Compani',
        body: payload.body,
      }));
    }
  }

  promises.push(CourseSmsHistory.create({
    type: payload.type,
    course: courseId,
    message: payload.body,
    sender: credentials._id,
    missingPhones,
  }));

  await Promise.all(promises);
};

exports.getSMSHistory = async courseId => CourseSmsHistory.find({ course: courseId })
  .populate({ path: 'sender', select: 'identity.firstname identity.lastname' })
  .populate({ path: 'missingPhones', select: 'identity.firstname identity.lastname' })
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
  const possibleMisc = course.misc ? ` - ${course.misc}` : '';
  const name = course.subProgram.program.name + possibleMisc;
  const slots = course.slots
    ? course.slots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    : [];

  const courseData = {
    name,
    slots: slots.map(exports.formatCourseSlotsForPdf),
    trainer: course.trainer ? UtilsHelper.formatIdentity(course.trainer.identity, 'FL') : '',
    firstDate: slots.length ? moment(slots[0].startDate).format('DD/MM/YYYY') : '',
    lastDate: slots.length ? moment(slots[slots.length - 1].startDate).format('DD/MM/YYYY') : '',
    duration: exports.getCourseDuration(slots),
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
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' }})
    .lean();

  return {
    fileName: 'emargement.pdf',
    pdf: await PdfHelper.generatePdf(exports.formatCourseForPdf(course), './src/data/attendanceSheet.html'),
  };
};

exports.formatCourseForDocx = course => ({
  duration: exports.getCourseDuration(course.slots),
  learningGoals: get(course, 'subProgram.program.learningGoals') || '',
  programName: get(course, 'subProgram.program.name').toUpperCase() || '',
  startDate: moment(course.slots[0].startDate).format('DD/MM/YYYY'),
  endDate: moment(course.slots[course.slots.length - 1].endDate).format('DD/MM/YYYY'),
});

exports.generateCompletionCertificates = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate('slots')
    .populate('trainees')
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name learningGoals' }})
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
