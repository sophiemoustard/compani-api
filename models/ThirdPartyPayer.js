const mongoose = require('mongoose');

const { BILLING_DIRECT, BILLING_INDIRECT } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');

const ThirdPartyPayerSchema = mongoose.Schema({
  name: String,
  address: addressSchemaDefinition,
  email: String,
  unitTTCRate: Number,
  billingMode: {
    type: String,
    enum: [BILLING_DIRECT, BILLING_INDIRECT]
  },
  company: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

module.exports = mongoose.model('ThirdPartyPayer', ThirdPartyPayerSchema);
