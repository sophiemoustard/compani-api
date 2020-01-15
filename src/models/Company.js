const mongoose = require('mongoose');

const { MONTH, TWO_WEEKS, COMPANY, ASSOCIATION } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');

const COMPANY_BILLING_PERIODS = [MONTH, TWO_WEEKS];
const COMPANY_TYPES = [COMPANY, ASSOCIATION];

const CompanySchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
  tradeName: { type: String, maxLength: 11, required: true },
  prefixNumber: { type: Number, required: true, unique: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false }) },
  rcs: { type: String },
  rna: { type: String },
  ics: { type: String },
  iban: { type: String },
  bic: { type: String },
  logo: { type: String },
  apeCode: { type: String, validate: /^\d{3,4}[A-Z]$/ },
  type: { type: String, enum: COMPANY_TYPES, default: COMPANY, required: true },
  folderId: { type: String, required: true },
  directDebitsFolderId: { type: String, required: true },
  customersFolderId: { type: String, required: true },
  rhConfig: {
    contractWithCompany: { grossHourlyRate: { type: Number, default: 0 } },
    contractWithCustomer: { grossHourlyRate: { type: Number, default: 0 } },
    feeAmount: Number,
    amountPerKm: Number,
    transportSubs: [{
      department: String,
      price: Number,
    }],
    templates: {
      contractWithCompany: driveResourceSchemaDefinition,
      contractWithCompanyVersion: driveResourceSchemaDefinition,
      contractWithCustomer: driveResourceSchemaDefinition,
      contractWithCustomerVersion: driveResourceSchemaDefinition,
    },
  },
  customersConfig: {
    billingPeriod: { type: String, enum: COMPANY_BILLING_PERIODS, default: TWO_WEEKS, required: true },
    templates: {
      folderId: String,
      debitMandate: driveResourceSchemaDefinition,
      quote: driveResourceSchemaDefinition,
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Company', CompanySchema);
module.exports.COMPANY_BILLING_PERIODS = COMPANY_BILLING_PERIODS;
module.exports.COMPANY_TYPES = COMPANY_TYPES;
