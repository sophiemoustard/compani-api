const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const { INTRA, INTER_B2B, INTER_B2C, STRICTLY_E_LEARNING, BLENDED } = require('../helpers/constants');
const { PHONE_VALIDATION } = require('./utils');

const COURSE_TYPES = [INTRA, INTER_B2B, INTER_B2C];
const COURSE_FORMATS = [STRICTLY_E_LEARNING, BLENDED];

const CourseSchema = mongoose.Schema({
  misc: { type: String },
  subProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'SubProgram', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required() { return this.type === INTRA; } },
  type: { type: String, required: true, enum: COURSE_TYPES },
  format: { type: String, enum: COURSE_FORMATS, default: BLENDED },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trainees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  contact: {
    name: { type: String, default: '' },
    email: { type: String },
    phone: { type: String, validate: PHONE_VALIDATION },
  },
  accessRules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
  attendanceSheets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSheet' }],
}, { timestamps: true });

// eslint-disable-next-line consistent-return
function getCompanies() {
  if (this.trainees && this.trainees.some(t => t.company)) {
    const redundantCompanies = this.trainees ? this.trainees.map(t => t.company._id.toHexString()) : [];
    return [...new Set(redundantCompanies)];
  }
}

CourseSchema.virtual('slots', {
  ref: 'CourseSlot',
  localField: '_id',
  foreignField: 'course',
  options: { match: { startDate: { $exists: true } }, sort: { startDate: 1 } },
});

CourseSchema.virtual('slotsToPlan', {
  ref: 'CourseSlot',
  localField: '_id',
  foreignField: 'course',
  options: { match: { startDate: { $exists: false } } },
});

CourseSchema.virtual('companies').get(getCompanies);

CourseSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Course', CourseSchema);
module.exports.COURSE_TYPES = COURSE_TYPES;
module.exports.COURSE_FORMATS = COURSE_FORMATS;
