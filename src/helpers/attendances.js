const get = require('lodash/get');
const Attendance = require('../models/Attendance');
const UtilsHelper = require('./utils');

exports.create = payload => (new Attendance(payload)).save();

exports.list = async (query, companyId) => {
  const attendances = await Attendance.find({ courseSlot: { $in: query } })
    .populate({ path: 'trainee', select: 'company', populate: { path: 'company' } })
    .lean();

  return companyId
    ? attendances.filter(a => UtilsHelper.areObjectIdsEquals(get(a, 'trainee.company'), companyId))
    : attendances;
};

exports.delete = async attendanceId => Attendance.deleteOne({ _id: attendanceId });
