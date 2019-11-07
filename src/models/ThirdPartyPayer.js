const mongoose = require('mongoose');
const Boom = require('boom');

const { BILLING_DIRECT, BILLING_INDIRECT } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const Customer = require('./Customer');

const ThirdPartyPayerSchema = mongoose.Schema({
  name: String,
  address: addressSchemaDefinition,
  email: String,
  unitTTCRate: Number,
  billingMode: {
    type: String,
    enum: [BILLING_DIRECT, BILLING_INDIRECT],
  },
  company: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

function validateQuery(next) {
  const query = this.getQuery();
  if (!query.company) next(Boom.badRequest());
  next();
}

function validatePayload(next) {
  const thidPartyPayer = this;
  if (!thidPartyPayer.company) next(Boom.badRequest());
  next();
}

const countFundings = async (docs) => {
  if (docs.length > 0) {
    for (const tpp of docs) {
      const customerCount = await Customer.countDocuments({ fundings: { $exists: true }, 'fundings.thirdPartyPayer': tpp._id });
      tpp.isUsedInFundings = customerCount > 0;
    }
  }
};

ThirdPartyPayerSchema.pre('validate', validatePayload);
ThirdPartyPayerSchema.pre('find', validateQuery);
ThirdPartyPayerSchema.post('find', countFundings);

module.exports = mongoose.model('ThirdPartyPayer', ThirdPartyPayerSchema);
