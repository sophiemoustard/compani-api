const get = require('lodash/get');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');
const CourseSlotsHelper = require('./courseSlots');
const StepsHelper = require('./steps');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN, GENERATION, UPLOAD } = require('./constants');
const Course = require('../models/Course');
const TrainerMission = require('../models/TrainerMission');
const TrainerMissionPdf = require('../data/pdf/trainerMission');

const getFileName = (programName, trainerIdentity) =>
  `ordre mission ${programName} ${UtilsHelper.formatIdentity(trainerIdentity, 'FL')}`;

const uploadDocument = async (payload, courseIds, file, fileName, method, credentials) => {
  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({ fileName, file });

  await TrainerMission.create({
    ...payload,
    courses: courseIds,
    file: fileUploaded,
    createdBy: credentials._id,
    creationMethod: method,
  });
};
exports.upload = async (payload, credentials) => {
  const courseIds = Array.isArray(payload.courses) ? payload.courses : [payload.courses];
  const course = await Course
    .findOne({ _id: courseIds[0] }, { trainer: 1, subProgram: 1 })
    .populate([
      { path: 'trainer', select: 'identity' },
      { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
    ])
    .lean();

  const programName = course.subProgram.program.name;
  const fileName = getFileName(programName, course.trainer.identity);

  return uploadDocument(payload, courseIds, payload.file, fileName, UPLOAD, credentials);
};

exports.list = async (query, credentials) => {
  const { trainer } = query;
  const isRofOrAdmin = [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER].includes(get(credentials, 'role.vendor.name'));

  return TrainerMission
    .find({ trainer })
    .populate({
      path: 'courses',
      select: 'misc type companies subProgram',
      populate: [
        { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
        { path: 'companies', select: 'name' },
      ],
    })
    .setOptions({ isVendorUser: isRofOrAdmin })
    .lean();
};

const formatData = async (courseIds, fee, credentials) => {
  const courses = await Course
    .find({ _id: { $in: courseIds } }, { hasCertifyingTest: 1, misc: 1, type: 1 })
    .populate({ path: 'companies', select: 'name' })
    .populate({ path: 'trainer', select: 'identity' })
    .populate({
      path: 'subProgram',
      select: 'program steps',
      populate: [{ path: 'program', select: 'name' }, { path: 'steps', select: 'theoreticalDuration type' }],
    })
    .populate({ path: 'slots', select: 'startDate endDate address' })
    .populate({ path: 'slotsToPlan', select: '_id' })
    .lean();

  const { trainer, subProgram, slots, slotsToPlan } = courses[0];

  const data = {
    trainerIdentity: trainer.identity,
    program: subProgram.program.name,
    slotsCount: slots.length + slotsToPlan.length,
    liveDuration: StepsHelper.computeLiveDuration(slots, slotsToPlan, subProgram.steps),
    groupCount: courses.length,
    companies: [...new Set(courses.map(c => UtilsHelper.formatName(c.companies)))].join(', '),
    addressList: CourseSlotsHelper.getAddressList(courses.map(c => c.slots).flat(), subProgram.steps),
    dates: CourseSlotsHelper.formatSlotDates(courses.map(c => c.slots).flat()),
    slotsToPlan: courses.reduce((acc, course) => acc + course.slotsToPlan.length, 0),
    certification: courses.filter(c => c.hasCertifyingTest),
    fee,
    createdBy: UtilsHelper.formatIdentity(credentials.identity, 'FL'),
  };

  return data;
};

exports.generate = async (payload, credentials) => {
  const courseIds = Array.isArray(payload.courses) ? payload.courses : [payload.courses];
  const data = await formatData(courseIds, payload.fee, credentials);

  const pdf = await TrainerMissionPdf.getPdf(data);
  const fileName = getFileName(data.program, data.trainerIdentity);
  pdf.hapi = {
    fileName,
    headers: {
      'content-disposition': `form-data; name="file"; filename="${fileName}"`,
      'content-type': 'application/pdf',
    },
  };

  return uploadDocument(payload, courseIds, pdf, fileName, GENERATION, credentials);
};
