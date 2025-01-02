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

exports.create = async (payload, credentials) => {
  let fileName;
  let companies;
  let slots = [];
  let signature = {};
  let fileUploaded = {};

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

    if (payload.slots) slots = Array.isArray(payload.slots) ? payload.slots : [payload.slots];
  }

  if (payload.file) {
    fileUploaded = await GCloudStorageHelper.uploadCourseFile({
      fileName: `emargement_${fileName}`,
      file: payload.file,
    });
  } else {
    fileName = `${credentials._id}_course_${payload.course}`;
    signature = await GCloudStorageHelper.uploadCourseFile({
      fileName: `trainer_signature_${fileName}`,
      file: payload.signature,
    });
  }

  await AttendanceSheet.create({
    ...omit(payload, 'signature'),
    companies,
    ...(Object.keys(fileUploaded).length
      ? { file: fileUploaded }
      : { signatures: { trainer: signature.link } }
    ),
    ...(slots.length && { slots }),
  });
};

exports.list = async (query, credentials) => {
  const isVendorUser = !!get(credentials, 'role.vendor');
  const companies = [];
  if (query.holding) companies.push(...credentials.holding.companies);
  if (query.company) companies.push(query.company);

  const attendanceSheets = await AttendanceSheet
    .find({ course: query.course, ...(companies.length && { companies: { $in: companies } }) })
    .populate({ path: 'trainee', select: 'identity' })
    .populate({ path: 'slots', select: 'startDate endDate step' })
    .setOptions({ isVendorUser })
    .lean();

  return attendanceSheets;
};

exports.update = async (attendanceSheetId, payload) =>
  AttendanceSheet.updateOne({ _id: attendanceSheetId }, { $set: payload });

exports.sign = async (attendanceSheetId, payload, credentials) => {
  const signature = await GCloudStorageHelper.uploadCourseFile({
    fileName: `trainee_signature_${credentials._id}`,
    file: payload.signature,
  });

  return AttendanceSheet.updateOne({ _id: attendanceSheetId }, { $set: { 'signatures.trainee': signature.link } });
};

exports.delete = async (attendanceSheetId) => {
  const attendanceSheet = await AttendanceSheet.findOne({ _id: attendanceSheetId }).lean();

  await AttendanceSheet.deleteOne({ _id: attendanceSheet._id });

  return GCloudStorageHelper.deleteCourseFile(attendanceSheet.file.publicId);
};
