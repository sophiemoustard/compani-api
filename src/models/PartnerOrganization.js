const mongoose = require('mongoose');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const PartnerOrganizationSchema = mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: mongoose.Schema(addressSchemaDefinition, { id: false, _id: false }) },
  email: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PartnerOrganization', PartnerOrganizationSchema);
