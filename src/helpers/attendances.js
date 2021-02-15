const Attendance = require('../models/Attendance');

exports.create = payload => (new Attendance(payload)).save();

exports.list = async query => Attendance.find({ courseSlot: { $in: query } }).lean();

exports.delete = async attendanceId => Attendance.deleteOne({ _id: attendanceId });
