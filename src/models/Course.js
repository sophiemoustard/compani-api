const mongoose = require('mongoose');
const { INTRA } = require('../helpers/constants');

const COURSE_TYPES = [INTRA];

const CourseSchema = mongoose.Schema({
  name: { type: String, required: true },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  companies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }],
  type: { type: String, required: true, enum: COURSE_TYPES },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trainees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

CourseSchema.virtual('slots', {
  ref: 'CourseSlot',
  localField: '_id',
  foreignField: 'courseId',
  options: { sort: { startDate: 1 } },
});

module.exports = mongoose.model('Course', CourseSchema);
module.exports.COURSE_TYPES = COURSE_TYPES;
