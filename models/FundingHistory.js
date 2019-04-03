const mongoose = require('mongoose');

const FundingHistorySchema = mongoose.Schema({
  funding: { type: mongoose.Schema.Types.ObjectId },
  amountTTC: Number,
  careHours: Number,
}, { timestamps: true });

module.exports = mongoose.model('FundingHistory', FundingHistorySchema)
