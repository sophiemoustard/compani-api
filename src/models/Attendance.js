const mongoose = require('mongoose');
const { formatQuery } = require('./preHooks/validate');

const AttendanceSchema = mongoose.Schema({
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseSlot', required: true },
}, { timestamps: true });

AttendanceSchema.pre('countDocuments', formatQuery);
AttendanceSchema.pre('find', formatQuery);
AttendanceSchema.pre('findOne', formatQuery);

module.exports = mongoose.model('Attendance', AttendanceSchema);
