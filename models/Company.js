const mongoose = require('mongoose');

const { MONTH, TWO_WEEKS } = require('../helpers/constants');

const CompanySchema = mongoose.Schema({
  name: {
    type: String,
    unique: true
  },
  address: {
    street: String,
    fullAddress: String,
    zipCode: String,
    city: String
  },
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
      contractWithCompany: {
        driveId: String,
        link: String,
      },
      contractWithCompanyVersion: {
        driveId: String,
        link: String
      },
      contractWithCustomer: {
        driveId: String,
        link: String,
      },
      contractWithCustomerVersion: {
        driveId: String,
        link: String
      }
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
      debitMandate: {
        driveId: String,
        link: String,
      },
      quote: {
        driveId: String,
        link: String,
      },
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', CompanySchema);
