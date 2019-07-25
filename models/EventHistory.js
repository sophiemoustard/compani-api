const mongoose = require('mongoose');
const { EVENT_TYPES, ABSENCE_TYPES } = require('./Event');
const { EVENT_CREATION, EVENT_DELETION, EVENT_UPDATE, REPETITION_FREQUENCIES } = require('../helpers/constants');
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
    location: addressSchemaDefinition,
    misc: { type: String },
    repetition: {
      frequency: { type: String, enum: REPETITION_FREQUENCIES },
    },
  },
  auxiliaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sectors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
}, { timestamps: true });

module.exports = mongoose.model('EventHistory', EventHistorySchema);
