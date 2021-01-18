const mongoose = require('mongoose');

const AttendanceSheetSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  file: {
    publicId: { type: String, required: true },
    link: { type: String, trim: true, required: true },
  },
  date: { type: Date },
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, id: false });

module.exports = mongoose.model('AttendanceSheet', AttendanceSheetSchema);
