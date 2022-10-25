const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const AttendanceSheetSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  file: {
    publicId: { type: String, required: true },
    link: { type: String, trim: true, required: true },
  },
  date: { type: Date },
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, id: false });

queryMiddlewareList.map(middleware => AttendanceSheetSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('AttendanceSheet', AttendanceSheetSchema);
