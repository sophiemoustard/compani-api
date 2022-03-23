const mongoose = require('mongoose');
const { PHONE_VALIDATION, SIRET_VALIDATION } = require('./utils');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const { workHealthServices } = require('../data/workHealthServices');
const { urssafCodes } = require('../data/urssafCodes');

// eslint-disable-next-line no-misleading-character-class
const ESTABLISHMENT_NAME_VALIDATION = /^[a-zA-Z0-9éèêëâàäöôûüîïç°2!#$%&'()*+,\-./:;<=>?@ ]{1,32}$/u;

const EstablishmentSchema = mongoose.Schema({
  name: { type: String, required: true, validate: ESTABLISHMENT_NAME_VALIDATION },
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

EstablishmentSchema.pre('find', validateQuery);
EstablishmentSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => EstablishmentSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Establishment', EstablishmentSchema);
module.exports.ESTABLISHMENT_NAME_VALIDATION = ESTABLISHMENT_NAME_VALIDATION;
module.exports.SIRET_VALIDATION = SIRET_VALIDATION;
