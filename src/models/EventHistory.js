const mongoose = require('mongoose');
const { EVENT_TYPES, ABSENCE_TYPES } = require('./Event');
const {
  EVENT_CREATION,
  EVENT_DELETION,
  EVENT_UPDATE,
  REPETITION_FREQUENCIES,
  EVENT_CANCELLATION_CONDITIONS,
  EVENT_CANCELLATION_REASONS,
  MANUAL_TIME_STAMPING,
  MANUAL_TIME_STAMPING_REASONS,
  QR_CODE_TIME_STAMPING,
} = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const { validateQuery, validateAggregation } = require('./preHooks/validate');

const EVENTS_HISTORY_ACTIONS = [
  EVENT_CREATION,
  EVENT_DELETION,
  EVENT_UPDATE,
  MANUAL_TIME_STAMPING,
  QR_CODE_TIME_STAMPING,
];
const TIME_STAMPING_ACTIONS = [MANUAL_TIME_STAMPING, QR_CODE_TIME_STAMPING];

const EventHistorySchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: EVENTS_HISTORY_ACTIONS },
  update: {
    auxiliary: {
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    startDate: { from: { type: Date }, to: { type: Date } },
    endDate: { from: { type: Date }, to: { type: Date } },
    startHour: { from: { type: Date }, to: { type: Date } },
    endHour: { from: { type: Date }, to: { type: Date } },
    cancel: {
      condition: { type: String, enum: EVENT_CANCELLATION_CONDITIONS },
      reason: { type: String, enum: EVENT_CANCELLATION_REASONS },
    },
  },
  event: {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, immutable: true },
    type: { type: String, enum: EVENT_TYPES },
    startDate: { type: Date },
    endDate: { type: Date },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    absence: { type: String, enum: ABSENCE_TYPES },
    internalHour: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalHour' },
    address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }) },
    misc: { type: String },
    repetition: {
      frequency: { type: String, enum: REPETITION_FREQUENCIES },
      parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    },
  },
  auxiliaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sectors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
  manualTimeStampingReason: { type: String, enum: Object.keys(MANUAL_TIME_STAMPING_REASONS) },
}, { timestamps: true });

EventHistorySchema.pre('find', validateQuery);
EventHistorySchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('EventHistory', EventHistorySchema);
module.exports.EVENTS_HISTORY_ACTIONS = EVENTS_HISTORY_ACTIONS;
module.exports.TIME_STAMPING_ACTIONS = TIME_STAMPING_ACTIONS;
