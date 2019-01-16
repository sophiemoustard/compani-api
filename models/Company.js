const mongoose = require('mongoose');

const { BILLING_DIRECT, BILLING_INDIRECT } = require('../helpers/constants');

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
  folderId: String,
  rhConfig: {
    providerContracts: {
      grossHourlyRate: Number
    },
    agentContracts: {
      grossHourlyRate: Number
    },
    phoneSubRefunding: Number,
    transportSubs: [{
      department: String,
      price: Number
    }],
    templates: {
      contract: {
        driveId: String,
        link: String
      },
      amendment: {
        driveId: String,
        link: String
      },
    },
    internalHours: [{
      name: String,
      default: { type: Boolean, default: false },
    }]
  },
  customersConfig: {
    services: [{
      name: String,
      nature: String,
      defaultUnitAmount: Number,
      vat: Number,
      holidaySurcharge: Number,
      eveningSurcharge: Number,
    }],
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
    },
    thirdPartyPayers: [{
      name: String,
      address: {
        street: String,
        fullAddress: String,
        zipCode: String,
        city: String
      },
      email: String,
      unitTTCPrice: Number,
      billingMode: {
        type: String,
        enum: [BILLING_DIRECT, BILLING_INDIRECT]
      },
      logo: {
        publicId: String,
        link: {
          type: String,
          trim: true
        }
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', CompanySchema);
