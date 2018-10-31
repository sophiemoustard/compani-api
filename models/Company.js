const mongoose = require('mongoose');

const CompanySchema = mongoose.Schema({
  name: {
    type: String,
    unique: true
  },
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
      folderId: String,
      contract: {
        driveId: String,
        link: String
      },
      amendment: {
        driveId: String,
        link: String
      }
    }
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Company', CompanySchema);
