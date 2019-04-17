const mongoose = require('mongoose');

const FundingHistorySchema = mongoose.Schema({
  fundingVersion: { type: mongoose.Schema.Types.ObjectId },
  amountTTC: { type: Number, default: 0 },
  careHours: { type: Number, default: 0 },
  month: String,
  nature: String,
}, { timestamps: true });

module.exports = mongoose.model('FundingHistory', FundingHistorySchema);
