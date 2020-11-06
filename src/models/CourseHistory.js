const mongoose = require('mongoose');
const { SLOT_CREATION, SLOT_DELETION, SLOT_EDITION } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const ACTION_TYPES = [SLOT_CREATION, SLOT_DELETION, SLOT_EDITION];

const CourseHistorySchema = mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  action: { type: String, required: true, enum: ACTION_TYPES, immutable: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, immutable: true },
  slot: {
    startDate: { type: Date, required: () => [SLOT_CREATION, SLOT_DELETION].includes(this.action) },
    endDate: { type: Date, required: () => [SLOT_CREATION, SLOT_DELETION].includes(this.action) },
    address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false }) },
  },
  update: {
    startDate: {
      from: { type: Date },
      to: { type: Date },
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('CourseHistory', CourseHistorySchema);
