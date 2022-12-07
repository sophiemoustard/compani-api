const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const AttendanceSchema = mongoose.Schema({
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseSlot', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => AttendanceSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Attendance', AttendanceSchema);
