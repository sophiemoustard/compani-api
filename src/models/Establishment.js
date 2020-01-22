const mongoose = require('mongoose');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const { workHealthServices } = require('../data/workHealthServices');
const { urssafCodes } = require('../data/urssafCodes');

const NAME_VALIDATION = /^[a-zA-Z0-9éèêëâàäöôûüîïç°2!#$%&'()*+,\-./:;<=>?@ ]{1,32}$/;
const SIRET_VALIDATION = /^\d{14}$/;
const PHONE_VALIDATION = /^[0]{1}[1-9]{1}[0-9]{8}$/;

const EstablishmentSchema = mongoose.Schema({
  name: { type: String, required: true, validate: NAME_VALIDATION },
  siret: { type: String, unique: true, validate: SIRET_VALIDATION, required: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false }), required: true },
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
module.exports.NAME_VALIDATION = NAME_VALIDATION;
module.exports.SIRET_VALIDATION = SIRET_VALIDATION;
module.exports.PHONE_VALIDATION = PHONE_VALIDATION;
