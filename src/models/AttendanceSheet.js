const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const { ORIGIN_OPTIONS } = require('../helpers/constants');

const AttendanceSheetSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  file: {
    publicId: { type: String, required: true },
    link: { type: String, trim: true, required: true },
  },
  date: { type: Date },
  trainee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companies: { type: [mongoose.Schema.Types.ObjectId], ref: 'Company', required: true },
  origin: { type: String, enum: ORIGIN_OPTIONS, required: true, immutable: true },
  slots: { type: [mongoose.Schema.Types.ObjectId], ref: 'CourseSlot', default: undefined },
}, { timestamps: true, id: false });

AttendanceSheetSchema.pre('find', validateQuery);
AttendanceSheetSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => AttendanceSheetSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('AttendanceSheet', AttendanceSheetSchema);
