const mongoose = require('mongoose');

const { BILLING_DIRECT, BILLING_INDIRECT } = require('../helpers/constants');

const ThirdPartyPayerSchema = mongoose.Schema({
  name: String,
  address: {
    street: String,
    fullAddress: String,
    zipCode: String,
    city: String
  },
  email: String,
  unitTTCRate: Number,
  billingMode: {
    type: String,
    enum: [BILLING_DIRECT, BILLING_INDIRECT]
  }
}, { timestamps: true });

module.exports = mongoose.model('ThirdPartyPayer', ThirdPartyPayerSchema);
