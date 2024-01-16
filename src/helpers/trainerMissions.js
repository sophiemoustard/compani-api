const get = require('lodash/get');
const omit = require('lodash/omit');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } = require('./constants');
const Course = require('../models/Course');
const TrainerMission = require('../models/TrainerMission');
const TrainerMissionPdf = require('../data/pdf/trainerMission');

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
  const trainerName = UtilsHelper.formatIdentity(course.trainer.identity, 'FL');

  const fileName = `ordre mission ${programName} ${trainerName}`;
  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({ fileName, file: payload.file });

  await TrainerMission.create({
    ...omit(payload, 'file'),
    courses: courseIds,
    file: fileUploaded,
    createdBy: credentials._id,
  });
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

exports.generate = async (payload, credentials) => {
  const courses = await Course
    .find({ _id: { $in: payload.courses } }, { hasCertifyingTest: 1, misc: 1, type: 1 })
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

  const infos = {
    identity: courses[0].trainer.identity,
    program: courses[0].subProgram.program.name,
    slotsCount: courses[0].slots.length + courses[0].slotsToPlan.length,
    liveDuration: UtilsHelper.computeLiveDuration(
      courses[0].slots,
      courses[0].slotsToPlan,
      courses[0].subProgram.steps
    ),
    groupCount: courses.length,
    companies: [...new Set(courses.map(c => UtilsHelper.formatName(c.companies)))].join(', '),
    addressList: UtilsHelper.getAddressList(courses.map(c => c.slots).flat(), courses[0].subProgram.steps),
    dates: UtilsHelper.getDates(courses.map(c => c.slots).flat()),
    slotsToPlan: courses.reduce((acc, course) => acc + course.slotsToPlan.length, 0),
    certification: courses.filter(c => c.hasCertifyingTest),
    fee: payload.fee,
    createdBy: UtilsHelper.formatIdentity(credentials.identity, 'FL'),
  };

  const pdf = await TrainerMissionPdf.getPdf(infos);
  const fileName = `ordre mission ${infos.program} ${UtilsHelper.formatIdentity(infos.identity, 'FL')}`;

  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({ fileName, file: pdf });

  await TrainerMission.create({
    ...payload,
    file: fileUploaded,
    createdBy: credentials._id,
  });
  return { fileName, pdf };
};
