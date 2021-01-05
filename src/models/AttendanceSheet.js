const mongoose = require('mongoose');

const AttendanceSheetSchema = mongoose.Schema({
  link: { type: String, trim: true, required: true },
  date: { type: Date },
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

AttendanceSheetSchema.virtual('course', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'attendanceSheets',
  justOne: true,
});

module.exports = mongoose.model('AttendanceSheet', AttendanceSheetSchema);
