const mongoose = require('mongoose');
const { REPETITION_FREQUENCIES, INTERVENTION } = require('../helpers/constants');
const { EVENT_TYPES } = require('./Event');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const RepetitionSchema = mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES },
  startDate: Date,
  endDate: Date,
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sector: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  subscription: { type: mongoose.Schema.Types.ObjectId },
  internalHour: { type: mongoose.Schema.Types.ObjectId, ref: 'InternalHour' },
  address: {
    type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }),
    required() { return this.type === INTERVENTION; },
  },
  misc: String,
  attachment: driveResourceSchemaDefinition,
  frequency: { type: String, enum: REPETITION_FREQUENCIES },
  parentId: { type: mongoose.Schema.Types.ObjectId },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

RepetitionSchema.pre('find', validateQuery);
RepetitionSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => RepetitionSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Repetition', RepetitionSchema);
