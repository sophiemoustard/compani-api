const mongoose = require('mongoose');
const { PHONE_VALIDATION } = require('./utils');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const PrescriberSchema = mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, validate: PHONE_VALIDATION },
  address: { type: mongoose.Schema(addressSchemaDefinition, { id: false, _id: false }) },
  email: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Prescriber', PrescriberSchema);
