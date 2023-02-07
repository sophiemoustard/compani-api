const omit = require('lodash/omit');
const get = require('lodash/get');
const AttendanceSheet = require('../models/AttendanceSheet');
const User = require('../models/User');
const Course = require('../models/Course');
const UserCompany = require('../models/UserCompany');
const GCloudStorageHelper = require('./gCloudStorage');
const UtilsHelper = require('./utils');
const { CompaniDate } = require('./dates/companiDates');
const { DAY_MONTH_YEAR } = require('./constants');

exports.create = async (payload) => {
  let fileName;
  let company;

  const course = await Course.findOne({ _id: payload.course }, { companies: 1 }).lean();

  if (payload.date) {
    fileName = CompaniDate(payload.date).format(DAY_MONTH_YEAR);
    [company] = course.companies;
  } else {
    const { identity } = await User.findOne({ _id: payload.trainee }, { identity: 1 }).lean();
    fileName = UtilsHelper.formatIdentity(identity, 'FL');

    const userCompany = await UserCompany.findOne({ user: payload.trainee }, { company: 1 }).lean();
    company = userCompany.company;
  }

  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({
    fileName: `emargement_${fileName}`,
    file: payload.file,
  });

  await AttendanceSheet.create({ ...omit(payload, 'file'), company, file: fileUploaded });
};

exports.list = async (courseId, company, credentials) => {
  const attendanceSheets = await AttendanceSheet
    .find({ course: courseId, ...(company && { company }) })
    .populate({ path: 'trainee', select: 'identity' })
    .setOptions({ isVendorUser: !!get(credentials, 'role.vendor') })
    .lean();

  return attendanceSheets;
};

exports.delete = async (attendanceSheet) => {
  await GCloudStorageHelper.deleteCourseFile(attendanceSheet.file.publicId);

  return AttendanceSheet.deleteOne({ _id: attendanceSheet._id });
};
