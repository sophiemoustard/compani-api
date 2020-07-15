const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const { INTRA, INTER_B2B } = require('../helpers/constants');
const { PHONE_VALIDATION } = require('./utils');

const COURSE_TYPES = [INTRA, INTER_B2B];

const CourseSchema = mongoose.Schema({
  misc: { type: String },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required() { return this.type === INTRA; } },
  type: { type: String, required: true, enum: COURSE_TYPES },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trainees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  contact: {
    name: { type: String, default: '' },
    email: { type: String },
    phone: { type: String, validate: PHONE_VALIDATION },
  },
}, { timestamps: true });

function getName() {
  const possiblyCompanyName = this.company ? `${this.company.name} - ` : '';
  const possiblyMisc = this.misc ? ` - ${this.misc}` : '';
  return possiblyCompanyName + this.program.name + possiblyMisc;
}

CourseSchema.virtual('slots', {
  ref: 'CourseSlot',
  localField: '_id',
  foreignField: 'courseId',
  options: { sort: { startDate: 1 } },
});

CourseSchema
  .virtual('name')
  .get(getName);

CourseSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Course', CourseSchema);
module.exports.COURSE_TYPES = COURSE_TYPES;
