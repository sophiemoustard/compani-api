const mongoose = require('mongoose');

const FundingLogSchema = mongoose.Schema({
  customer: {
    customerId: { type: mongoose.Schema.Types.ObjectId },
    firstname: String,
    lastname: String,
    ogustId: String
  },
  funding: {
    services: [String],
    thirdPartyPayer: String,
    folderNumber: String,
    nature: String,
    frequency: String,
    careDays: [String],
    customerParticipationRate: Number,
    effectiveDate: Date,
    amountTTC: Number,
    unitTTCRate: Number,
    careHours: Number,
    endDate: Date,
  },
  deletedAt: {
    type: Date,
    default: Date.now
  },
});

module.exports = mongoose.model('FundingLog', FundingLogSchema);
