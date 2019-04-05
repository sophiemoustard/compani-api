const mongoose = require('mongoose');

const FundingHistorySchema = mongoose.Schema({
  fundingVersion: { type: mongoose.Schema.Types.ObjectId, unique: true },
  amountTTC: { type: Number, default: 0 },
  careHours: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('FundingHistory', FundingHistorySchema);
