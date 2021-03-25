const get = require('lodash/get');
const Attendance = require('../models/Attendance');
const UtilsHelper = require('./utils');

exports.create = payload => (new Attendance(payload)).save();

exports.list = async (query, company) => {
  const attendances = await Attendance.find({ courseSlot: { $in: query } })
    .populate({ path: 'trainee', select: 'company' })
    .lean();

  return company
    ? attendances.filter(a => UtilsHelper.areObjectIdsEquals(get(a, 'trainee.company'), company))
    : attendances;
};

exports.delete = async attendanceId => Attendance.deleteOne({ _id: attendanceId });
