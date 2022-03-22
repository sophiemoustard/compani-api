const mongoose = require('mongoose');
const {
  validateQuery,
  validateUpdateOne,
  formatQuery,
  formatQueryMiddlewareList,
} = require('./preHooks/validate');
const { SIRET_VALIDATION } = require('./utils');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const VendorCompanySchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }) },
  siret: { type: String, validate: SIRET_VALIDATION, required: true, unique: true },
}, { timestamps: true, collection: 'vendorcompany' });

VendorCompanySchema.pre('findOne', validateQuery);
VendorCompanySchema.pre('updateOne', validateUpdateOne);
formatQueryMiddlewareList().map(middleware => VendorCompanySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('VendorCompany', VendorCompanySchema);
module.exports.SIRET_VALIDATION = SIRET_VALIDATION;
