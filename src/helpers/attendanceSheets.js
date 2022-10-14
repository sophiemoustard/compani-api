const omit = require('lodash/omit');
const get = require('lodash/get');
const AttendanceSheet = require('../models/AttendanceSheet');
const User = require('../models/User');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');
const DatesHelper = require('./dates');

exports.create = async (payload) => {
  let fileName;
  if (payload.date) fileName = DatesHelper.format(payload.date, 'D MMMM YYYY');
  else {
    const { identity } = await User.findOne({ _id: payload.trainee }, { identity: 1 }).lean();
    fileName = UtilsHelper.formatIdentity(identity, 'FL');
  }

  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({
    fileName: `emargement_${fileName}`,
    file: payload.file,
  });

  return AttendanceSheet.create({ ...omit(payload, 'file'), file: fileUploaded });
};

exports.list = async (courseId, companyId) => {
  const attendanceSheets = await AttendanceSheet.find({ course: courseId })
    .populate({ path: 'trainee', select: 'identity company', populate: { path: 'company' } })
    .lean();

  return companyId
    ? attendanceSheets.filter(a => UtilsHelper.areObjectIdsEquals(get(a, 'trainee.company'), companyId))
    : attendanceSheets;
};

exports.delete = async (attendanceSheet) => {
  await GCloudStorageHelper.deleteCourseFile(attendanceSheet.file.publicId);

  return AttendanceSheet.deleteOne({ _id: attendanceSheet._id });
};
