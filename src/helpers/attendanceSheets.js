const omit = require('lodash/omit');
const moment = require('moment');
const AttendanceSheet = require('../models/AttendanceSheet');
const User = require('../models/User');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');

exports.create = async (payload) => {
  let fileName = moment(payload.date).format('DD-MMMM-YYYY');
  if (payload.trainee) {
    const { identity } = await User.findOne({ _id: payload.trainee }).lean();

    fileName = UtilsHelper.formatIdentity(identity, 'FL');
  }
  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({
    fileName: `emargement_${fileName}`,
    file: payload.file,
  });

  return AttendanceSheet.create({ ...omit(payload, 'file'), file: fileUploaded });
};

exports.list = async query => AttendanceSheet.find({ course: query.course }).lean();
