const mongoose = require('mongoose');
const { EVENT_TYPES } = require('./Event');
const { EVENT_CREATION, EVENT_DELETION } = require('../helpers/constants');

const EVENTS_HISTORY_ACTIONS = [EVENT_CREATION, EVENT_DELETION];

const EventHistorySchema = mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, enum: EVENTS_HISTORY_ACTIONS },
  event: {
    type: { type: String, enum: EVENT_TYPES },
    startDate: Date,
    endDate: Date,
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  auxiliaries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sectors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sector' }],
}, { timestamps: true });

module.exports = mongoose.model('EventHistory', EventHistorySchema);
