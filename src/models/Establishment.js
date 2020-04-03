const mongoose = require('mongoose');
const { PHONE_VALIDATION, NAME_VALIDATION, SIRET_VALIDATION } = require('./utils');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const { workHealthServices } = require('../data/workHealthServices');
const { urssafCodes } = require('../data/urssafCodes');

const EstablishmentSchema = mongoose.Schema({
  name: { type: String, required: true, validate: NAME_VALIDATION },
  siret: { type: String, unique: true, validate: SIRET_VALIDATION, required: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }), required: true },
  phone: { type: String, validate: PHONE_VALIDATION, required: true },
  workHealthService: { type: String, enum: workHealthServices, required: true },
  urssafCode: { type: String, enum: urssafCodes, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
  id: false,
});

EstablishmentSchema.virtual('usersCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'establishment',
  count: true,
});

EstablishmentSchema.pre('validate', validatePayload);
EstablishmentSchema.pre('find', validateQuery);
EstablishmentSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('Establishment', EstablishmentSchema);
