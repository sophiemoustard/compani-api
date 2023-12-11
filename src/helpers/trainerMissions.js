const omit = require('lodash/omit');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');
const Course = require('../models/Course');
const TrainerMission = require('../models/TrainerMission');

exports.create = async (payload, credentials) => {
  const course = await Course
    .findOne({ _id: payload.courses[0] }, { trainer: 1, subProgram: 1 })
    .populate([
      { path: 'trainer', select: 'identity' },
      { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
    ])
    .lean();

  const programName = course.subProgram.program.name;
  const trainerName = UtilsHelper.formatIdentity(course.trainer.identity, 'FL');

  const fileName = UtilsHelper.formatFileName(`ordre_mission ${programName} ${trainerName}`);
  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({ fileName, file: payload.file });

  await TrainerMission.create({ ...omit(payload, 'file'), file: fileUploaded, createdBy: credentials._id });
};
