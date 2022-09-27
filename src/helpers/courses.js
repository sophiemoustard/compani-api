const path = require('path');
const get = require('lodash/get');
const has = require('lodash/has');
const omit = require('lodash/omit');
const groupBy = require('lodash/groupBy');
const fs = require('fs');
const os = require('os');
const Boom = require('@hapi/boom');
const { CompaniDate } = require('./dates/companiDates');
const Course = require('../models/Course');
const User = require('../models/User');
const Questionnaire = require('../models/Questionnaire');
const CourseSmsHistory = require('../models/CourseSmsHistory');
const Attendance = require('../models/Attendance');
const SubProgram = require('../models/SubProgram');
const CourseRepository = require('../repositories/CourseRepository');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const DatesHelper = require('./dates');
const ZipHelper = require('./zip');
const SmsHelper = require('./sms');
const DocxHelper = require('./docx');
const StepsHelper = require('./steps');
const NumbersHelper = require('./numbers');
const drive = require('../models/Google/Drive');
const {
  INTRA,
  INTER_B2B,
  COURSE_SMS,
  STRICTLY_E_LEARNING,
  DRAFT,
  REJECTED,
  ON_SITE,
  E_LEARNING,
  MOBILE,
  WEBAPP,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
  REMOTE,
  OPERATIONS,
} = require('./constants');
const CourseHistoriesHelper = require('./courseHistories');
const NotificationHelper = require('./notifications');
const InterAttendanceSheet = require('../data/pdf/attendanceSheet/interAttendanceSheet');
const IntraAttendanceSheet = require('../data/pdf/attendanceSheet/intraAttendanceSheet');
const CourseConvocation = require('../data/pdf/courseConvocation');
const CompletionCertificate = require('../data/pdf/completionCertificate');
const CourseBill = require('../models/CourseBill');
const CourseSlot = require('../models/CourseSlot');
const CourseHistory = require('../models/CourseHistory');

exports.createCourse = async (payload) => {
  const course = await (new Course(payload)).save();

  const subProgram = await SubProgram
    .findOne({ _id: course.subProgram }, { steps: 1 })
    .populate({ path: 'steps', select: '_id type' })
    .lean();

  const slots = subProgram.steps
    .filter(step => [ON_SITE, REMOTE].includes(step.type))
    .map(step => ({ course: course._id, step: step._id }));

  if (slots.length) await CourseSlot.insertMany(slots);

  return course;
};

exports.getTotalTheoreticalHours = course => (course.subProgram.steps.length
  ? course.subProgram.steps.reduce((acc, value) => NumbersHelper.oldAdd(acc, value.theoreticalHours || 0), 0)
  : 0
);

const listStrictlyElearningForCompany = async (query, origin) => {
  const courses = await CourseRepository.findCourseAndPopulate(
    { ...omit(query, 'company'), accessRules: { $in: [query.company, []] } },
    origin
  );

  return courses.map(course => ({
    ...course,
    totalTheoreticalHours: exports.getTotalTheoreticalHours(course),
    trainees: course.trainees.filter(t =>
      (t.company ? UtilsHelper.areObjectIdsEquals(t.company._id, query.company) : false)),
  }));
};

const listBlendedForCompany = async (query, origin) => {
  const intraCourse = await CourseRepository.findCourseAndPopulate({ ...query, type: INTRA }, origin);
  const interCourse = await CourseRepository.findCourseAndPopulate(
    { ...omit(query, ['company']), type: INTER_B2B },
    origin,
    true
  );

  return [
    ...intraCourse,
    ...interCourse.filter(course => course.companies && course.companies.includes(query.company))
      .map(course => ({
        ...omit(course, ['companies']),
        trainees: course.trainees.filter(t =>
          (t.company ? UtilsHelper.areObjectIdsEquals(t.company._id, query.company) : false)),
      })),
  ];
};

const listForOperations = async (query, origin) => {
  if (query.company && query.format === STRICTLY_E_LEARNING) {
    return listStrictlyElearningForCompany(query, origin);
  }
  if (query.company) return listBlendedForCompany(query, origin);

  const courses = await CourseRepository.findCourseAndPopulate(query, origin);

  if (query.format === STRICTLY_E_LEARNING) {
    return courses.map(course => ({ ...course, totalTheoreticalHours: exports.getTotalTheoreticalHours(course) }));
  }

  return courses;
};

const listForPedagogy = async (query, credentials) => {
  const trainee = await User
    .findOne({ _id: query.trainee || get(credentials, '_id') }, { company: 1 })
    .populate({ path: 'company' })
    .lean();

  const courses = await Course.find(
    { trainees: trainee._id, $or: [{ accessRules: [] }, { accessRules: trainee.company }] },
    { format: 1 }
  )
    .populate({
      path: 'subProgram',
      select: 'program steps',
      populate: [
        { path: 'program', select: 'name image description' },
        {
          path: 'steps',
          select: 'name type activities theoreticalHours',
          populate: {
            path: 'activities',
            select: 'name type cards activityHistories',
            populate: [
              { path: 'activityHistories', match: { user: trainee._id } },
              { path: 'cards', select: 'template' },
            ],
          },
        },
      ],
    })
    .populate({
      path: 'slots',
      select: 'startDate endDate step',
      populate: [{ path: 'step', select: 'type' }, { path: 'attendances', match: { trainee: trainee._id } }],
    })
    .select('_id misc')
    .lean({ autopopulate: true, virtuals: true });

  return courses.map(course => exports.formatCourseWithProgress(course));
};

exports.list = async (query, credentials) => {
  const filteredQuery = omit(query, ['origin', 'action']);
  return query.action === OPERATIONS
    ? listForOperations(filteredQuery, query.origin)
    : listForPedagogy(filteredQuery, credentials);
};

const getStepProgress = (step) => {
  if (has(step, 'progress.live')) return step.progress.live;
  return step.progress.eLearning;
};

exports.getCourseProgress = (steps) => {
  if (!steps || !steps.length) return {};

  const elearningProgressSteps = steps.filter(step => has(step, 'progress.eLearning'));

  const presenceProgressSteps = steps.filter(step => step.progress.presence);

  const blendedStepsCombinedProgress = steps.map(step => getStepProgress(step)).reduce((acc, value) => acc + value, 0);

  const eLearningStepsCombinedProgress = elearningProgressSteps
    .map(step => step.progress.eLearning)
    .reduce((acc, value) => acc + value, 0);

  const combinedPresenceProgress = presenceProgressSteps.length
    ? {
      attendanceDuration: UtilsHelper
        .computeDuration(presenceProgressSteps.map(step => step.progress.presence.attendanceDuration))
        .toObject(),
      maxDuration: UtilsHelper
        .computeDuration(presenceProgressSteps.map(step => step.progress.presence.maxDuration))
        .toObject(),
    }
    : null;

  return {
    blended: blendedStepsCombinedProgress / steps.length,
    ...(elearningProgressSteps.length && { eLearning: eLearningStepsCombinedProgress / elearningProgressSteps.length }),
    ...(combinedPresenceProgress && { presence: combinedPresenceProgress }),
  };
};

exports.formatCourseWithProgress = (course) => {
  const steps = course.subProgram.steps
    .map((step) => {
      const slots = course.slots.filter(slot => UtilsHelper.areObjectIdsEquals(slot.step._id, step._id));

      return { ...step, slots, progress: StepsHelper.getProgress(step, slots) };
    });

  return {
    ...course,
    subProgram: { ...course.subProgram, steps },
    progress: exports.getCourseProgress(steps),
  };
};

const getCourseForOperations = async (courseId, loggedUser, origin) => {
  const fetchedCourse = await Course.findOne({ _id: courseId })
    .populate([
      { path: 'company', select: 'name' },
      {
        path: 'trainees',
        select: 'identity.firstname identity.lastname local.email contact picture.link firstMobileConnection',
        populate: { path: 'company', populate: { path: 'company', select: 'name' } },
      },
      {
        path: 'subProgram',
        select: 'program steps',
        populate: [
          { path: 'program', select: 'name learningGoals' },
          ...(origin === WEBAPP
            ? [{
              path: 'steps',
              select: 'name type theoreticalHours',
              populate: {
                path: 'activities',
                select: 'name type',
                populate: { path: 'activityHistories', select: 'user' },
              },
            }]
            : []
          ),
        ],
      },
      ...(origin === WEBAPP
        ? [
          { path: 'slots', select: 'step startDate endDate address meetingLink' },
          { path: 'slotsToPlan', select: '_id step' },
          {
            path: 'trainer',
            select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
          },
          { path: 'accessRules', select: 'name' },
          {
            path: 'salesRepresentative',
            select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
          },
          {
            path: 'companyRepresentative',
            select: 'identity.firstname identity.lastname contact.phone local.email picture.link',
          },
          { path: 'contact', select: 'identity.firstname identity.lastname contact.phone' },
        ]
        : []
      ),
    ])
    .lean();

  // A coach/client_admin is not supposed to read infos on trainees from other companies
  // espacially for INTER_B2B courses.
  if (get(loggedUser, 'role.vendor')) {
    return { ...fetchedCourse, totalTheoreticalHours: exports.getTotalTheoreticalHours(fetchedCourse) };
  }

  return {
    ...fetchedCourse,
    totalTheoreticalHours: exports.getTotalTheoreticalHours(fetchedCourse),
    trainees: fetchedCourse.trainees
      .filter(t => UtilsHelper.areObjectIdsEquals(get(t, 'company._id'), get(loggedUser, 'company._id'))),
  };
};

exports.getCourse = async (query, params, loggedUser) => (
  query.action === OPERATIONS
    ? getCourseForOperations(params._id, loggedUser, query.origin)
    : getCourseForPedagogy(params._id, loggedUser)
);

exports.selectUserHistory = (histories) => {
  const groupedHistories = Object.values(groupBy(histories, 'user'));

  return groupedHistories.map(userHistories => UtilsHelper.getLastVersion(userHistories, 'createdAt'));
};

exports.formatActivity = (activity) => {
  const followUp = {};
  const filteredHistories = exports.selectUserHistory(activity.activityHistories);
  for (const history of filteredHistories) {
    for (const answer of history.questionnaireAnswersList) {
      const { answerList } = answer;
      if (answerList.length === 1 && !answerList[0].trim()) continue;

      if (!followUp[answer.card._id]) followUp[answer.card._id] = { ...answer.card, answers: [] };
      followUp[answer.card._id].answers.push(...answerList);
    }
  }

  return {
    ...activity,
    followUp: Object.values(followUp),
    activityHistories: activity.activityHistories.map(a => a._id),
  };
};

exports.formatStep = step => ({ ...step, activities: step.activities.map(a => exports.formatActivity(a)) });

exports.getCourseFollowUp = async (course, company) => {
  const courseWithTrainees = await Course.findOne({ _id: course._id }, { trainees: 1 }).lean();

  const courseFollowUp = await Course.findOne({ _id: course._id }, { subProgram: 1 })
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
    .populate({
      path: 'trainees',
      select: 'identity.firstname identity.lastname firstMobileConnection',
      populate: { path: 'company' },
    })
    .lean();

  return {
    ...courseFollowUp,
    subProgram: {
      ...courseFollowUp.subProgram,
      steps: courseFollowUp.subProgram.steps.map(s => exports.formatStep(s)),
    },
    trainees: courseFollowUp.trainees
      .filter(t => !company || UtilsHelper.areObjectIdsEquals(t.company, company))
      .map(t => ({
        ...t,
        ...exports.getTraineeElearningProgress(t._id, courseFollowUp.subProgram.steps),
      })),
  };
};

exports.getQuestionnaireAnswers = async (courseId) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({
      path: 'subProgram',
      select: 'steps',
      populate: [
        {
          path: 'steps',
          select: 'activities',
          populate: {
            path: 'activities',
            populate: {
              path: 'activityHistories',
              populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
            },
          },
        },
      ],
    })
    .lean();

  const courseActivities = get(course, 'subProgram.steps', []).map(step => step.activities).flat();
  const activitiesWithFollowUp = courseActivities.map(activity => exports.formatActivity(activity));

  return activitiesWithFollowUp.filter(act => act.followUp.length).map(act => act.followUp).flat();
};

exports.getTraineeElearningProgress = (traineeId, steps) => {
  const formattedSteps = steps
    .filter(step => step.type === E_LEARNING)
    .map((s) => {
      const traineeStep = {
        ...s,
        activities: s.activities.map(a => ({
          ...a,
          activityHistories: a.activityHistories.filter(ah => UtilsHelper.areObjectIdsEquals(ah.user, traineeId)),
        })),
      };

      return { ...traineeStep, progress: StepsHelper.getProgress(traineeStep) };
    });

  return { steps: formattedSteps, progress: exports.getCourseProgress(formattedSteps) };
};

const getCourseForPedagogy = async (courseId, credentials) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({
      path: 'subProgram',
      select: 'program steps',
      populate: [
        { path: 'program', select: 'name image description learningGoals' },
        {
          path: 'steps',
          select: 'name type activities theoreticalHours',
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
    .populate({
      path: 'slots',
      select: 'startDate endDate step address meetingLink',
      populate: [{ path: 'step', select: 'type' }, { path: 'attendances', match: { trainee: credentials._id } }],
    })
    .populate({ path: 'trainer', select: 'identity.firstname identity.lastname biography picture' })
    .populate({ path: 'contact', select: 'identity.firstname identity.lastname contact.phone local.email' })
    .select('_id misc')
    .lean({ autopopulate: true, virtuals: true });

  if (course.trainer && UtilsHelper.areObjectIdsEquals(course.trainer._id, credentials._id)) {
    return {
      ...course,
      subProgram: {
        ...course.subProgram,
        steps: course.subProgram.steps.map(step => ({
          ...step,
          activities: step.activities.map(activity => ({ ...omit(activity, 'activityHistories') })),
        })),
      },
    };
  }

  if (!course.subProgram.isStrictlyELearning) {
    const lastSlot = course.slots.sort(DatesHelper.descendingSort('startDate'))[0];
    const areLastSlotAttendancesValidated = !!(lastSlot &&
      await Attendance.countDocuments({ courseSlot: lastSlot._id }));

    return exports.formatCourseWithProgress({ ...course, areLastSlotAttendancesValidated });
  }

  return exports.formatCourseWithProgress(course);
};

exports.updateCourse = async (courseId, payload) => {
  const params = payload.contact === ''
    ? { $set: omit(payload, 'contact'), $unset: { contact: '' } }
    : { $set: payload };

  return Course.findOneAndUpdate({ _id: courseId }, params).lean();
};

exports.deleteCourse = async courseId => Promise.all([
  Course.deleteOne({ _id: courseId }),
  CourseBill.deleteMany({
    course: courseId,
    $or: [{ billedAt: { $exists: false } }, { billedAt: { $not: { $type: 'date' } } }],
  }),
  CourseSmsHistory.deleteMany({ course: courseId }),
  CourseHistory.deleteMany({ course: courseId }),
  CourseSlot.deleteMany({ course: courseId }),
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

  const smsSentStatus = await Promise.allSettled(promises);
  if (!smsSentStatus.length) return;

  if (smsSentStatus.every(res => res.status === REJECTED)) throw Boom.badRequest(smsSentStatus[0].reason);
  else {
    await CourseSmsHistory.create({
      type: payload.type,
      course: courseId,
      message: payload.content,
      sender: credentials._id,
      missingPhones,
    });
  }
};

exports.getSMSHistory = async courseId => CourseSmsHistory.find({ course: courseId })
  .populate({ path: 'sender', select: 'identity.firstname identity.lastname' })
  .populate({ path: 'missingPhones', select: 'identity.firstname identity.lastname' })
  .lean();

exports.addCourseTrainee = async (courseId, payload, credentials) => {
  await Course.updateOne({ _id: courseId }, { $addToSet: { trainees: payload.trainee } });

  const trainee = await User.findOne({ _id: payload.trainee }, { formationExpoTokenList: 1 }).lean();

  await Promise.all([
    CourseHistoriesHelper.createHistoryOnTraineeAddition(
      { course: courseId, traineeId: trainee._id },
      credentials._id
    ),
    NotificationHelper.sendBlendedCourseRegistrationNotification(trainee, courseId),
  ]);
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
  const duration = UtilsHelper.getDuration(slot.startDate, slot.endDate);

  return {
    address: get(slot, 'address.fullAddress') || null,
    date: CompaniDate(slot.startDate).format('dd/LL/yyyy'),
    startHour: CompaniDate(slot.startDate).format('HH:mm'),
    endHour: CompaniDate(slot.endDate).format('HH:mm'),
    duration,
  };
};

exports.groupSlotsByDate = (slots) => {
  const group = groupBy(slots, slot => CompaniDate(slot.startDate).format('dd/LL/yyyy'));

  return Object.values(group).sort((a, b) => DatesHelper.ascendingSort('startDate')(a[0], b[0]));
};

exports.formatIntraCourseForPdf = (course) => {
  const possibleMisc = course.misc ? ` - ${course.misc}` : '';
  const name = course.subProgram.program.name + possibleMisc;
  const courseData = {
    name,
    duration: UtilsHelper.getTotalDuration(course.slots),
    company: course.company.name,
    trainer: course.trainer ? UtilsHelper.formatIdentity(course.trainer.identity, 'FL') : '',
  };

  const filteredSlots = course.slots.filter(slot => slot.step.type === ON_SITE);
  const slotsGroupedByDate = exports.groupSlotsByDate(filteredSlots);

  return {
    dates: slotsGroupedByDate.map(groupedSlots => ({
      course: { ...courseData },
      address: get(groupedSlots[0], 'address.fullAddress') || '',
      slots: groupedSlots.map(slot => exports.formatIntraCourseSlotsForPdf(slot)),
      date: CompaniDate(groupedSlots[0].startDate).format('dd/LL/yyyy'),
    })),
  };
};

exports.formatInterCourseForPdf = (course) => {
  const possibleMisc = course.misc ? ` - ${course.misc}` : '';
  const name = course.subProgram.program.name + possibleMisc;
  const filteredSlots = course.slots
    ? course.slots
      .filter(slot => slot.step.type === ON_SITE)
      .sort((a, b) => DatesHelper.ascendingSort('startDate')(a, b))
    : [];

  const courseData = {
    name,
    slots: filteredSlots.map(exports.formatInterCourseSlotsForPdf),
    trainer: course.trainer ? UtilsHelper.formatIdentity(course.trainer.identity, 'FL') : '',
    firstDate: filteredSlots.length ? CompaniDate(filteredSlots[0].startDate).format('dd/LL/yyyy') : '',
    lastDate: filteredSlots.length
      ? CompaniDate(filteredSlots[filteredSlots.length - 1].startDate).format('dd/LL/yyyy')
      : '',
    duration: UtilsHelper.getTotalDuration(filteredSlots),
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
  const course = await Course
    .findOne({ _id: courseId }, { misc: 1, type: 1 })
    .populate({ path: 'company', select: 'name' })
    .populate({ path: 'slots', select: 'step startDate endDate address', populate: { path: 'step', select: 'type' } })
    .populate({
      path: 'trainees',
      select: 'identity company',
      populate: { path: 'company', populate: { path: 'company', select: 'name' } },
    })
    .populate({ path: 'trainer', select: 'identity' })
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } })
    .lean();

  const template = course.type === INTRA
    ? await IntraAttendanceSheet.getPdfContent(exports.formatIntraCourseForPdf(course))
    : await InterAttendanceSheet.getPdfContent(exports.formatInterCourseForPdf(course));
  const pdf = await PdfHelper.generatePdf(template);

  return { fileName: 'emargement.pdf', pdf };
};

exports.formatCourseForDocuments = (course) => {
  const sortedCourseSlots = course.slots.sort((a, b) => DatesHelper.ascendingSort('startDate')(a, b));

  return {
    duration: UtilsHelper.getTotalDuration(course.slots),
    learningGoals: get(course, 'subProgram.program.learningGoals') || '',
    programName: get(course, 'subProgram.program.name').toUpperCase() || '',
    startDate: CompaniDate(sortedCourseSlots[0].startDate).format('dd/LL/yyyy'),
    endDate: CompaniDate(sortedCourseSlots[sortedCourseSlots.length - 1].endDate).format('dd/LL/yyyy'),
  };
};

const getTraineeInformations = (trainee, courseAttendances) => {
  const traineeIdentity = UtilsHelper.formatIdentity(trainee.identity, 'FL');
  const traineeSlots = courseAttendances
    .filter(a => UtilsHelper.areObjectIdsEquals(trainee._id, a.trainee))
    .map(a => a.courseSlot);
  const attendanceDuration = UtilsHelper.getTotalDuration(traineeSlots);

  return { traineeIdentity, attendanceDuration };
};

const generateCompletionCertificatePdf = async (courseData, courseAttendances, trainee) => {
  const { traineeIdentity, attendanceDuration } = getTraineeInformations(trainee, courseAttendances);

  const template = await CompletionCertificate.getPdfContent({
    ...courseData,
    trainee: { identity: traineeIdentity, attendanceDuration },
    date: CompaniDate().format('dd/LL/yyyy'),
  });

  return { pdf: await PdfHelper.generatePdf(template), name: `Attestation - ${traineeIdentity}.pdf` };
};

const generateCompletionCertificateWord = async (courseData, courseAttendances, trainee, templatePath) => {
  const { traineeIdentity, attendanceDuration } = getTraineeInformations(trainee, courseAttendances);
  const filePath = await DocxHelper.createDocx(
    templatePath,
    {
      ...courseData,
      trainee: { identity: traineeIdentity, attendanceDuration },
      date: CompaniDate().format('dd/LL/yyyy'),
    }
  );

  return { name: `Attestation - ${traineeIdentity}.docx`, file: fs.createReadStream(filePath) };
};

const getTraineelist = (course, credentials) => {
  const isRofOrAdmin = [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(get(credentials, 'role.vendor.name'));
  const isCourseTrainer = [TRAINER].includes(get(credentials, 'role.vendor.name')) &&
    UtilsHelper.areObjectIdsEquals(credentials._id, course.trainer);
  const canAccessAllTrainees = isRofOrAdmin || isCourseTrainer;

  return canAccessAllTrainees
    ? course.trainees
    : course.trainees.filter(t => UtilsHelper.areObjectIdsEquals(t.company, get(credentials, 'company._id')));
};

exports.generateCompletionCertificates = async (courseId, credentials, origin = null) => {
  const course = await Course.findOne({ _id: courseId })
    .populate({ path: 'slots', select: 'startDate endDate' })
    .populate({ path: 'trainees', select: 'identity', populate: { path: 'company' } })
    .populate({ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name learningGoals' } })
    .lean();

  const attendances = await Attendance.find({ courseSlot: course.slots.map(s => s._id) })
    .populate({ path: 'courseSlot', select: 'startDate endDate' })
    .lean();

  const courseData = exports.formatCourseForDocuments(course);

  if (origin === MOBILE) {
    const trainee = course.trainees.find(t => UtilsHelper.areObjectIdsEquals(t._id, credentials._id));
    return generateCompletionCertificatePdf(courseData, attendances, trainee);
  }

  const templatePath = path.join(os.tmpdir(), 'certificate_template.docx');
  await drive.downloadFileById({
    fileId: process.env.GOOGLE_DRIVE_TRAINING_CERTIFICATE_TEMPLATE_ID,
    tmpFilePath: templatePath,
  });
  const promises = getTraineelist(course, credentials)
    .map(trainee => generateCompletionCertificateWord(courseData, attendances, trainee, templatePath));

  return ZipHelper.generateZip('attestations.zip', await Promise.all(promises));
};

exports.addAccessRule = async (courseId, payload) => Course.updateOne(
  { _id: courseId },
  { $push: { accessRules: payload.company } }
);

exports.deleteAccessRule = async (courseId, accessRuleId) => Course.updateOne(
  { _id: courseId },
  { $pull: { accessRules: accessRuleId } }
);

exports.formatHoursForConvocation = slots => slots.reduce(
  (acc, slot) => {
    const slotHours =
      `${UtilsHelper.formatHourWithMinutes(slot.startDate)} - ${UtilsHelper.formatHourWithMinutes(slot.endDate)}`;

    return acc === '' ? slotHours : `${acc} / ${slotHours}`;
  },
  ''
);

exports.formatCourseForConvocationPdf = (course) => {
  const slotsGroupedByDate = exports.groupSlotsByDate(course.slots);

  const slots = slotsGroupedByDate.map(groupedSlots => ({
    ...(get(groupedSlots[0], 'address.fullAddress') && { address: get(groupedSlots[0], 'address.fullAddress') }),
    ...(groupedSlots[0].meetingLink && { meetingLink: groupedSlots[0].meetingLink }),
    hours: exports.formatHoursForConvocation(groupedSlots),
    date: CompaniDate(groupedSlots[0].startDate).format('dd/LL/yyyy'),
  }));
  const contact = {
    formattedIdentity: UtilsHelper.formatIdentity(get(course, 'contact.identity'), 'FL'),
    email: get(course, 'contact.local.email'),
    formattedPhone: UtilsHelper.formatPhoneNumber(get(course, 'contact.contact.phone')),
  };
  const trainer = {
    ...course.trainer,
    formattedIdentity: UtilsHelper.formatIdentity(get(course, 'trainer.identity'), 'FL'),
  };

  return { ...course, trainer, contact, slots };
};

exports.generateConvocationPdf = async (courseId) => {
  const course = await Course.findOne({ _id: courseId }, { misc: 1 })
    .populate({
      path: 'subProgram',
      select: 'program',
      populate: { path: 'program', select: 'name description' },
    })
    .populate({ path: 'slots', select: 'startDate endDate address meetingLink' })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .populate({ path: 'contact', select: 'identity.firstname identity.lastname contact.phone local.email' })
    .populate({ path: 'trainer', select: 'identity.firstname identity.lastname biography' })
    .lean();

  const courseName = get(course, 'subProgram.program.name', '').split(' ').join('-') || 'Formation';

  const template = await CourseConvocation.getPdfContent(exports.formatCourseForConvocationPdf(course));

  return { pdf: await PdfHelper.generatePdf(template), courseName };
};

exports.getQuestionnaires = async (courseId) => {
  const questionnaires = await Questionnaire.find({ status: { $ne: DRAFT } })
    .select('type name')
    .populate({ path: 'historiesCount', match: { course: courseId, questionnaireAnswersList: { $ne: [] } } })
    .lean();

  return questionnaires.filter(questionnaire => questionnaire.historiesCount);
};
