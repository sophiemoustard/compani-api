const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const { ORIGIN_OPTIONS } = require('../helpers/constants');

const AttendanceSheetSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  file: {
    publicId: { type: String, required() { return !this.signature.publicId; } },
    link: { type: String, trim: true, required() { return !this.signature.link; } },
  },
  signature: {
    publicId: { type: String, required() { return !this.file.publicId; } },
    link: { type: String, trim: true, required() { return !this.file.link; } },
  },
  date: { type: Date },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseSlot' },
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companies: { type: [mongoose.Schema.Types.ObjectId], ref: 'Company', required: true },
  origin: { type: String, enum: ORIGIN_OPTIONS, required: true, immutable: true },
}, { timestamps: true, id: false });

AttendanceSheetSchema.pre('find', validateQuery);
AttendanceSheetSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => AttendanceSheetSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('AttendanceSheet', AttendanceSheetSchema);
