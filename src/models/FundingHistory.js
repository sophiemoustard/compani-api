const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const FundingHistorySchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  fundingId: { type: mongoose.Schema.Types.ObjectId },
  amountTTC: { type: String, default: '0' },
  careHours: { type: String, default: '0' },
  month: { type: String },
}, { timestamps: true });

FundingHistorySchema.pre('aggregate', validateAggregation);
FundingHistorySchema.pre('find', validateQuery);
queryMiddlewareList.map(middleware => FundingHistorySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('FundingHistory', FundingHistorySchema);
