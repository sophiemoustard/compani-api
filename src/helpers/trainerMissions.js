const get = require('lodash/get');
const omit = require('lodash/omit');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } = require('./constants');
const Course = require('../models/Course');
const TrainerMission = require('../models/TrainerMission');

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
