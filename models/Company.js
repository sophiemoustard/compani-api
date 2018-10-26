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
    contractTemplate: {
      folderId: String,
      id: String,
      link: String
    }
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Company', CompanySchema);
