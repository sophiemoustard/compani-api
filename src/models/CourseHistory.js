const mongoose = require('mongoose');
const { SLOT_CREATION } = require('../helpers/constants');

const ACTION_TYPES = [SLOT_CREATION];

const CourseHistorySchema = mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  action: { type: String, required: true, enum: ACTION_TYPES, immutable: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, immutable: true },
  slot: {
    startDate: { type: Date },
    endDate: { type: Date },
    address: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('CourseHistory', CourseHistorySchema);
