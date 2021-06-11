const mongoose = require('mongoose');

const { validateQuery, validateAggregation } = require('./preHooks/validate');
const { BILLING_DIRECT, BILLING_INDIRECT } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const Customer = require('./Customer');

const ThirdPartyPayerSchema = mongoose.Schema({
  name: String,
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }) },
  email: String,
  unitTTCRate: Number,
  billingMode: {
    type: String,
    enum: [BILLING_DIRECT, BILLING_INDIRECT],
  },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
  isApa: { type: Boolean, required: true },
  teletransmissionId: { type: String },
}, { timestamps: true });

const countFundings = async (docs) => {
  if (docs.length > 0) {
    for (const tpp of docs) {
      const customerCount = await Customer
        .countDocuments({ fundings: { $exists: true }, 'fundings.thirdPartyPayer': tpp._id });
      tpp.isUsedInFundings = customerCount > 0;
    }
  }
};

ThirdPartyPayerSchema.pre('find', validateQuery);
ThirdPartyPayerSchema.pre('aggregate', validateAggregation);
ThirdPartyPayerSchema.post('find', countFundings);

module.exports = mongoose.model('ThirdPartyPayer', ThirdPartyPayerSchema);
