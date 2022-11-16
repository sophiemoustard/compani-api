const mongoose = require('mongoose');
const {
  SLOT_CREATION,
  SLOT_DELETION,
  SLOT_EDITION,
  TRAINEE_ADDITION,
  TRAINEE_DELETION,
  ESTIMATED_START_DATE_EDITION,
} = require('../helpers/constants');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const ACTION_TYPES = [
  SLOT_CREATION,
  SLOT_DELETION,
  SLOT_EDITION,
  TRAINEE_ADDITION,
  TRAINEE_DELETION,
  ESTIMATED_START_DATE_EDITION,
];

const CourseHistorySchema = mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  action: { type: String, required: true, enum: ACTION_TYPES, immutable: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, immutable: true },
  slot: {
    startDate: { type: Date, required: () => [SLOT_CREATION, SLOT_DELETION].includes(this.action) },
    endDate: { type: Date, required: () => [SLOT_CREATION, SLOT_DELETION].includes(this.action) },
    address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false }) },
    meetingLink: { type: String },
  },
  update: {
    startDate: {
      type: mongoose.Schema({ from: { type: Date }, to: { type: Date } }),
      required: () => this.action === SLOT_EDITION && !this.update.startHour,
    },
    startHour: {
      type: mongoose.Schema({ from: { type: Date }, to: { type: Date } }),
      required: () => this.action === SLOT_EDITION && !this.update.startDate,
    },
    endHour: {
      type: mongoose.Schema({ from: { type: Date }, to: { type: Date } }),
      required: () => this.action === SLOT_EDITION && this.update.startHour,
    },
    estimatedStartDate: {
      type: mongoose.Schema({ from: { type: Date }, to: { type: Date } }),
      required: () => this.action === ESTIMATED_START_DATE_EDITION,
    },
  },
  trainee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: () => [TRAINEE_ADDITION, TRAINEE_DELETION].includes(this.action),
  },
}, { timestamps: true });

queryMiddlewareList.map(middleware => CourseHistorySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseHistory', CourseHistorySchema);
