const path = require('path');
const get = require('lodash/get');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const groupBy = require('lodash/groupBy');
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
const SmsHelper = require('./sms');
const DocxHelper = require('./docx');
const StepsHelper = require('./steps');
const drive = require('../models/Google/Drive');
const { INTRA, INTER_B2B, COURSE_SMS } = require('./constants');
const CourseHistoriesHelper = require('./courseHistories');

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
      ...interCourse.filter(course => course.companies && course.companies.includes(query.company))
        .map(course => ({
          ...omit(course, ['companies']),
          trainees: course.trainees.filter(t => query.company === t.company._id.toHexString()),
        })),
    ];
  }

  return CourseRepository.findCourseAndPopulate(query);
};

exports.listUserCourses = async (traineeId) => {
  const courses = await Course.find({ trainees: traineeId }, { format: 1 })
    .populate({
      path: 'subProgram',
      select: 'program steps',
      populate: [
        { path: 'program', select: 'name image' },
        {
          path: 'steps',
          select: 'name type activities',
          populate: {
            path: 'activities',
            select: 'name type cards activityHistories',
            populate: [
              { path: 'activityHistories', match: { user: traineeId } },
              { path: 'cards', select: 'template' },
            ],
          },
        },
      ],
    })
    .populate({ path: 'slots', select: 'startDate endDate step', populate: { path: 'step', select: 'type' } })
    .select('_id misc')
    .lean({ autopopulate: true, virtuals: true });

  return courses.map(course => ({
    ...course,
    subProgram: {
      ...course.subProgram,
      steps: course.subProgram.steps.map(step => ({ ...step, progress: StepsHelper.getProgress(step, course.slots) })),
    },
  }));
};

exports.getCourse = async (course, loggedUser) => {
  const userHasVendorRole = !!get(loggedUser, 'role.vendor');
  const userCompanyId = get(loggedUser, 'company._id') || null;
  // A coach/client_admin is not supposed to read infos on trainees from other companies
  // espacially for INTER_B2B courses.
  const traineesCompanyMatch = userHasVendorRole ? {} : { company: userCompanyId };

  return Course.findOne({ _id: course._id })
    .populate({ path: 'company', select: 'name' })
    .populate({
      path: 'subProgram',
      select: 'program steps',
      populate: [{ path: 'program', select: 'name description' }, { path: 'steps', select: 'name type' }],
    })
    .populate({ path: 'slots', populate: { path: 'step', select: 'name' } })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .populate({
      path: 'trainees',
      match: traineesCompanyMatch,
      select: 'identity.firstname identity.lastname local.email company contact',
      populate: { path: 'company', select: 'name' },
    })
    .populate({ path: 'trainer', select: 'identity.firstname identity.lastname' })
    .lean();
};

exports.getCoursePublicInfos = async course => Course.findOne({ _id: course._id })
  .populate({
    path: 'subProgram',
    select: 'program',
    populate: { path: 'program', select: 'name description' },
  })
  .populate('slots')
  .populate({ path: 'slotsToPlan', select: '_id' })
  .populate({ path: 'trainer', select: 'identity.firstname identity.lastname biography' })
  .lean();

exports.selectUserHistory = (histories) => {
  const groupedHistories = Object.values(groupBy(histories, 'user'));

  return groupedHistories.map(userHistories => UtilsHelper.getLastVersion(userHistories, 'createdAt'));
};

exports.formatActivity = (activity) => {
  const followUp = {};
  const filteredHistories = exports.selectUserHistory(activity.activityHistories);
  for (const history of filteredHistories) {
    for (const answer of history.questionnaireAnswersList) {
      if (!followUp[answer.card._id]) followUp[answer.card._id] = { ...answer.card, answers: [] };
      followUp[answer.card._id].answers.push(...answer.answerList);
    }
  }

  return {
    ...activity,
    followUp: Object.values(followUp),
    activityHistories: activity.activityHistories.map(a => a._id),
  };
};

exports.formatStep = step => ({ ...step, activities: step.activities.map(a => exports.formatActivity(a)) });

exports.getCourseFollowUp = async (course) => {
  const courseWithTrainees = await Course.findOne({ _id: course._id }).select('trainees').lean();

  const courseFollowUp = await Course.findOne({ _id: course._id })
    .select('subProgram')
    .populate({
      path: 'subProgram',
      select: 'name steps program',
      populate: [
        { path: 'program', select: 'name' },
        {
          path: 'steps',
          select: 'name activities type',
          populate: {
            path: 'activities',
            select: 'name type',
            populate: {
              path: 'activityHistories',
              match: { user: { $in: courseWithTrainees.trainees } },
              populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
            },
          },
        },
      ],
    })
    .populate({ path: 'trainees', select: 'identity.firstname identity.lastname' })
    .populate({ path: 'slots', populate: { path: 'step', select: '_id' } })
    .lean();

  return {
    ...courseFollowUp,
    subProgram: {
      ...courseFollowUp.subProgram,
      steps: courseFollowUp.subProgram.steps.map(s => exports.formatStep(s)),
    },
    trainees: courseFollowUp.trainees.map(t => ({
      ...t,
      steps: exports.getTraineeProgress(t._id, courseFollowUp.subProgram.steps, courseFollowUp.slots),
    })),
  };
};

exports.getTraineeProgress = (traineeId, steps, slots) => steps.map((s) => {
  const traineeStep = {
    ...s,
    activities: s.activities.map(a => ({
      ...a,
      activityHistories: a.activityHistories.filter(ah => UtilsHelper.areObjectIdsEquals(ah.user, traineeId)),
    })),
  };

  return { ...traineeStep, progress: StepsHelper.getProgress(traineeStep, slots) };
});

exports.getTraineeCourse = async (courseId, credentials) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({
      path: 'subProgram',
      select: 'program steps',
      populate: [
        { path: 'program', select: 'name image' },
        {
          path: 'steps',
          select: 'name type activities',
          populate: {
            path: 'activities',
            select: 'name type cards activityHistories',
            populate: [
              { path: 'activityHistories', match: { user: credentials._id } },
              { path: 'cards', select: 'template' },
            ],
          },
        },
      ],
    })
    .populate({ path: 'slots', select: 'startDate endDate step address' })
    .select('_id misc')
    .lean({ autopopulate: true, virtuals: true });

  return {
    ...course,
    subProgram: {
      ...course.subProgram,
      steps: course.subProgram.steps.map(step => ({ ...step, progress: StepsHelper.getProgress(step, course.slots) })),
    },
  };
};

exports.updateCourse = async (courseId, payload) =>
  Course.findOneAndUpdate({ _id: courseId }, { $set: flat(payload) }).lean();

exports.deleteCourse = async courseId => Promise.all([
  Course.deleteOne({ _id: courseId }),
  CourseSmsHistory.deleteMany({ course: courseId }),
]);

exports.sendSMS = async (courseId, payload, credentials) => {
  const course = await Course.findById(courseId)
    .populate({ path: 'trainees', select: '_id contact' })
    .lean();

  const promises = [];
  const missingPhones = [];
  for (const trainee of course.trainees) {
    if (!get(trainee, 'contact.phone')) missingPhones.push(trainee._id);
    else {
      promises.push(SmsHelper.send({
        recipient: `+33${trainee.contact.phone.substring(1)}`,
        sender: 'Compani',
        content: payload.content,
        tag: COURSE_SMS,
      }));
    }
  }

  promises.push(CourseSmsHistory.create({
    type: payload.type,
    course: courseId,
    message: payload.content,
    sender: credentials._id,
    missingPhones,
  }));

  await Promise.all(promises);
};

exports.getSMSHistory = async courseId => CourseSmsHistory.find({ course: courseId })
  .populate({ path: 'sender', select: 'identity.firstname identity.lastname' })
  .populate({ path: 'missingPhones', select: 'identity.firstname identity.lastname' })
  .lean();

exports.addCourseTrainee = async (courseId, payload, trainee, credentials) => {
  const addedTrainee = trainee || await UsersHelper.createUser(payload);

  if (trainee && !trainee.company) await UsersHelper.updateUser(trainee._id, pick(payload, 'company'), null);

  await CourseHistoriesHelper.createHistoryOnTraineeAddition(
    { course: courseId, traineeId: addedTrainee._id },
    credentials._id
  );

  return Course.findOneAndUpdate({ _id: courseId }, { $addToSet: { trainees: addedTrainee._id } }, { new: true })
    .lean();
};

exports.registerToELearningCourse = async (courseId, credentials) =>
  Course.updateOne({ _id: courseId }, { $addToSet: { trainees: credentials._id } });

exports.removeCourseTrainee = async (courseId, traineeId, user) => Promise.all([
  CourseHistoriesHelper.createHistoryOnTraineeDeletion({ course: courseId, traineeId }, user._id),
  Course.updateOne({ _id: courseId }, { $pull: { trainees: traineeId } }),
]);

exports.formatIntraCourseSlotsForPdf = slot => ({
  startHour: UtilsHelper.formatHourWithMinutes(slot.startDate),
  endHour: UtilsHelper.formatHourWithMinutes(slot.endDate),
});

exports.formatInterCourseSlotsForPdf = (slot) => {
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

exports.formatIntraCourseForPdf = (course) => {
  const possibleMisc = course.misc ? ` - ${course.misc}` : '';
  const name = course.subProgram.program.name + possibleMisc;
  const courseData = {
    name,
    duration: exports.getCourseDuration(course.slots),
    company: course.company.name,
    trainer: course.trainer ? UtilsHelper.formatIdentity(course.trainer.identity, 'FL') : '',
  };

  const slotsGroupedByDate = Object.values(groupBy(course.slots, slot => moment(slot.startDate).format('DD/MM/YYYY')))
    .sort((a, b) => new Date(a[0].startDate) - new Date(b[0].startDate));

  return {
    dates: slotsGroupedByDate.map(groupedSlots => ({
      course: { ...courseData },
      address: get(groupedSlots[0], 'address.fullAddress') || '',
      slots: groupedSlots.map(slot => exports.formatIntraCourseSlotsForPdf(slot)),
      date: moment(groupedSlots[0].startDate).format('DD/MM/YYYY'),
    })),
  };
};

exports.formatInterCourseForPdf = (course) => {
  const possibleMisc = course.misc ? ` - ${course.misc}` : '';
  const name = course.subProgram.program.name + possibleMisc;
  const slots = course.slots ? course.slots.sort((a, b) => new Date(a.startDate) - new Date(b.startDate)) : [];

  const courseData = {
    name,
    slots: slots.map(exports.formatInterCourseSlotsForPdf),
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
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } })
    .lean();

  const pdf = course.type === INTRA
    ? await PdfHelper.generatePdf(exports.formatIntraCourseForPdf(course), './src/data/intraAttendanceSheet.html')
    : await PdfHelper.generatePdf(exports.formatInterCourseForPdf(course), './src/data/interAttendanceSheet.html');

  return { fileName: 'emargement.pdf', pdf };
};

exports.formatCourseForDocx = course => ({
  duration: exports.getCourseDuration(course.slots),
  description: get(course, 'subProgram.program.description') || '',
  programName: get(course, 'subProgram.program.name').toUpperCase() || '',
  startDate: moment(course.slots[0].startDate).format('DD/MM/YYYY'),
  endDate: moment(course.slots[course.slots.length - 1].endDate).format('DD/MM/YYYY'),
});

exports.generateCompletionCertificates = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate('slots')
    .populate('trainees')
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name description' } })
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
