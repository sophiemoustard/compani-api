const mongoose = require('mongoose');

const { MONTH, TWO_WEEKS } = require('../helpers/constants');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const driveFileSchemaDefinition = require('./schemaDefinitions/driveFile');

const CompanySchema = mongoose.Schema({
  name: {
    type: String,
    unique: true
  },
  address: addressSchemaDefinition,
  rcs: String,
  ics: String,
  iban: String,
  bic: String,
  folderId: String,
  directDebitsFolderId: String,
  rhConfig: {
    contractWithCompany: {
      grossHourlyRate: Number
    },
    contractWithCustomer: {
      grossHourlyRate: Number
    },
    feeAmount: Number,
    amountPerKm: Number,
    transportSubs: [{
      department: String,
      price: Number
    }],
    templates: {
      contractWithCompany: driveFileSchemaDefinition,
      contractWithCompanyVersion: driveFileSchemaDefinition,
      contractWithCustomer: driveFileSchemaDefinition,
      contractWithCustomerVersion: driveFileSchemaDefinition,
    },
    internalHours: [{
      name: String,
      default: { type: Boolean, default: false },
    }]
  },
  customersConfig: {
    billingPeriod: { type: String, enum: [MONTH, TWO_WEEKS], default: TWO_WEEKS },
    templates: {
      folderId: String,
      debitMandate: driveFileSchemaDefinition,
      quote: driveFileSchemaDefinition,
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', CompanySchema);
