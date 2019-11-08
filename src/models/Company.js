const mongoose = require('mongoose');

const { MONTH, TWO_WEEKS, COMPANY, ASSOCIATION } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');

const COMPANY_BILLING_PERIODS = [MONTH, TWO_WEEKS];
const COMPANY_TYPES = [COMPANY, ASSOCIATION];

const CompanySchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
  tradeName: { type: String, maxLength: 11, required: true },
  address: addressSchemaDefinition,
  rcs: String,
  rna: String,
  ics: String,
  iban: String,
  bic: String,
  type: { type: String, enum: COMPANY_TYPES, default: COMPANY },
  folderId: String,
  directDebitsFolderId: String,
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
    internalHours: [{
      name: String,
      default: { type: Boolean, default: false },
    }],
  },
  customersConfig: {
    billingPeriod: { type: String, enum: COMPANY_BILLING_PERIODS, default: TWO_WEEKS },
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
