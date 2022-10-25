const mongoose = require('mongoose');

const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');
const { BILLING_DIRECT, BILLING_INDIRECT, APA, AM, PCH } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const Customer = require('./Customer');

const TELETRANSMISSION_TYPES = [APA, AM, PCH];

const ThirdPartyPayerSchema = mongoose.Schema({
  /*  unique mongo index on both keys 'name' and 'company' (with case and diacritics insensitive collation)
      has been added manually in mep58 */
  name: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }) },
  email: { type: String },
  unitTTCRate: { type: Number },
  billingMode: { type: String, enum: [BILLING_DIRECT, BILLING_INDIRECT], required: true },
  isApa: { type: Boolean, required: true },
  teletransmissionId: { type: String },
  companyCode: { type: String, required: () => !!this.teletransmissionId },
  teletransmissionType: { type: String, enum: TELETRANSMISSION_TYPES, required: () => !!this.teletransmissionId },
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
queryMiddlewareList.map(middleware => ThirdPartyPayerSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('ThirdPartyPayer', ThirdPartyPayerSchema);
module.exports.TELETRANSMISSION_TYPES = TELETRANSMISSION_TYPES;
