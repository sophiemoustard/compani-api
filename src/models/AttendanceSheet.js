const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const { ORIGIN_OPTIONS } = require('../helpers/constants');

const AttendanceSheetSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  file: {
    publicId: { type: String, required() { return !this.signatures; } },
    link: { type: String, trim: true, required() { return !this.signatures; } },
  },
  date: { type: Date },
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companies: { type: [mongoose.Schema.Types.ObjectId], ref: 'Company', required: true },
  origin: { type: String, enum: ORIGIN_OPTIONS, required: true, immutable: true },
  slots: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'CourseSlot',
    default: undefined,
    required() { return !!this.signatures; },
  },
  signatures: { type: { trainer: { type: String, trim: true } }, default: undefined, _id: false, id: false },
}, { timestamps: true, id: false });

AttendanceSheetSchema.pre('find', validateQuery);
AttendanceSheetSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => AttendanceSheetSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('AttendanceSheet', AttendanceSheetSchema);
