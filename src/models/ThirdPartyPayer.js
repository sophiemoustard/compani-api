const mongoose = require('mongoose');

const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');
const { BILLING_DIRECT, BILLING_INDIRECT, APA, AM, PCH } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const Customer = require('./Customer');

const TELETRANSMISSION_TYPES = [APA, AM, PCH];

const ThirdPartyPayerSchema = mongoose.Schema({
  name: { type: String, required: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }) },
  email: { type: String },
  unitTTCRate: { type: Number },
  billingMode: { type: String, enum: [BILLING_DIRECT, BILLING_INDIRECT], required: true },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
  isApa: { type: Boolean, required: true },
  teletransmissionId: { type: String },
  companyCode: { type: String },
  teletransmissionType: { type: String, enum: TELETRANSMISSION_TYPES },
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
formatQueryMiddlewareList().map(middleware => ThirdPartyPayerSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('ThirdPartyPayer', ThirdPartyPayerSchema);
module.exports.TELETRANSMISSION_TYPES = TELETRANSMISSION_TYPES;
