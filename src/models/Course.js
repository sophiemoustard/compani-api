const mongoose = require('mongoose');
const { INTRA } = require('../helpers/constants');

const COURSE_TYPES = [INTRA];

const CourseSchema = mongoose.Schema({
  name: { type: String, required: true },
  program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  companies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: this.type === INTRA }],
  type: { type: String, required: true, enum: COURSE_TYPES },
}, { timestamps: true });

module.exports = mongoose.model('Course', CourseSchema);
module.exports.COURSE_TYPES = COURSE_TYPES;
