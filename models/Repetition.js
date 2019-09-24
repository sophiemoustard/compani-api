const mongoose = require('mongoose');
const { REPETITION_FREQUENCIES } = require('../helpers/constants');
const { EVENT_TYPES } = require('./Event');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const { CONTRACT_STATUS } = require('./Contract');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const RepetitionSchema = mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES },
  startDate: Date,
  endDate: Date,
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sector: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  subscription: { type: mongoose.Schema.Types.ObjectId },
  internalHour: {
    name: String,
    _id: { type: mongoose.Schema.Types.ObjectId },
  },
  address: addressSchemaDefinition,
  misc: String,
  attachment: driveResourceSchemaDefinition,
  frequency: { type: String, enum: REPETITION_FREQUENCIES },
  parentId: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String, enum: CONTRACT_STATUS },
}, { timestamps: true });

module.exports = mongoose.model('Repetition', RepetitionSchema);
