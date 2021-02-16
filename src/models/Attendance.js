const mongoose = require('mongoose');

const AttendanceSchema = mongoose.Schema({
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseSlot: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseSlot', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
