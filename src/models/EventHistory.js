const mongoose = require('mongoose');
const { EVENT_TYPES, ABSENCE_TYPES } = require('./Event');
const {
  EVENT_CREATION,
  EVENT_DELETION,
  EVENT_UPDATE,
  REPETITION_FREQUENCIES,
  EVENT_CANCELLATION_CONDITIONS,
  EVENT_CANCELLATION_REASONS,
} = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const EVENTS_HISTORY_ACTIONS = [EVENT_CREATION, EVENT_DELETION, EVENT_UPDATE];

const EventHistorySchema = mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: EVENTS_HISTORY_ACTIONS },
  update: {
    auxiliary: {
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    startDate: {
      from: Date,
      to: Date,
    },
    endDate: {
      from: Date,
      to: Date,
    },
    startHour: {
      from: Date,
      to: Date,
    },
    endHour: {
      from: Date,
      to: Date,
    },
    cancel: {
      condition: { type: String, enum: EVENT_CANCELLATION_CONDITIONS },
      reason: { type: String, enum: EVENT_CANCELLATION_REASONS },
    },
  },
  event: {
    type: { type: String, enum: EVENT_TYPES },
    startDate: Date,
    endDate: Date,
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    absence: { type: String, enum: ABSENCE_TYPES },
    internalHour: {
      name: String,
      _id: { type: mongoose.Schema.Types.ObjectId },
    },
    address: addressSchemaDefinition,
    misc: { type: String },
    repetition: {
      frequency: { type: String, enum: REPETITION_FREQUENCIES },
    },
  },
  auxiliaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sectors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
}, { timestamps: true });

function paginate(query, pageSize = 10, lastId = null) {
  if (lastId) query._id = { $lt: lastId };
  return this
    .find(query)
    .populate({ path: 'auxiliaries', select: '_id identity' })
    .populate({ path: 'createdBy', select: '_id identity picture' })
    .populate({ path: 'event.customer', select: '_id identity' })
    .populate({ path: 'event.auxiliary', select: '_id identity' })
    .populate({ path: 'update.auxiliary.from', select: '_id identity' })
    .populate({ path: 'update.auxiliary.to', select: '_id identity' })
    .sort({ createdAt: -1 })
    .limit(pageSize);
}

EventHistorySchema.statics.paginate = paginate;

module.exports = mongoose.model('EventHistory', EventHistorySchema);
