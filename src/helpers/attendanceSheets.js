const omit = require('lodash/omit');
const get = require('lodash/get');
const AttendanceSheet = require('../models/AttendanceSheet');
const User = require('../models/User');
const Course = require('../models/Course');
const CourseHistoriesHelper = require('./courseHistories');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');
const { CompaniDate } = require('./dates/companiDates');
const { DAY_MONTH_YEAR, COURSE, TRAINEE } = require('./constants');

exports.create = async (payload) => {
  let fileName;
  let companies;

  const course = await Course.findOne({ _id: payload.course }, { companies: 1 }).lean();

  if (payload.date) {
    fileName = CompaniDate(payload.date).format(DAY_MONTH_YEAR);
    companies = course.companies;
  } else {
    const { identity } = await User.findOne({ _id: payload.trainee }, { identity: 1 }).lean();
    fileName = UtilsHelper.formatIdentity(identity, 'FL');

    const traineeCompanyAtCourseRegistration = await CourseHistoriesHelper
      .getCompanyAtCourseRegistrationList(
        { key: COURSE, value: payload.course }, { key: TRAINEE, value: [payload.trainee] }
      );
    companies = [get(traineeCompanyAtCourseRegistration[0], 'company')];
  }
  if (payload.file) {
    const fileUploaded = await GCloudStorageHelper.uploadCourseFile({
      fileName: `emargement_${fileName}`,
      file: payload.file,
    });
    await AttendanceSheet.create({ ...omit(payload, 'file'), companies, file: fileUploaded });
  }
  if (payload.signature) {
    const fileUploaded = await GCloudStorageHelper.uploadCourseFile({
      fileName: `signature_${fileName}`,
      file: payload.signature,
    });
    await AttendanceSheet.create({ ...omit(payload, 'file'), companies, signature: fileUploaded });
  }
};

exports.list = async (query, credentials) => {
  const isVendorUser = !!get(credentials, 'role.vendor');
  const companies = [];
  if (query.holding) companies.push(...credentials.holding.companies);
  if (query.company) companies.push(query.company);

  const attendanceSheets = await AttendanceSheet
    .find({ course: query.course, ...(companies.length && { companies: { $in: companies } }) })
    .populate({ path: 'trainee', select: 'identity' })
    .setOptions({ isVendorUser })
    .lean();

  return attendanceSheets;
};

exports.delete = async (attendanceSheetId) => {
  const attendanceSheet = await AttendanceSheet.findOne({ _id: attendanceSheetId }).lean();

  await AttendanceSheet.deleteOne({ _id: attendanceSheet._id });

  return GCloudStorageHelper.deleteCourseFile(attendanceSheet.file.publicId);
};
