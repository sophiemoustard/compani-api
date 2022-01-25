const mongoose = require('mongoose');
const {
  validateQuery,
  validateAggregation,
  validateUpdateOne,
  formatQuery,
  formatQueryMiddlewareList,
} = require('./preHooks/validate');

const QuoteNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

QuoteNumberSchema.pre('find', validateQuery);
QuoteNumberSchema.pre('aggregate', validateAggregation);
QuoteNumberSchema.pre('updateOne', validateUpdateOne);
formatQueryMiddlewareList().map(middleware => QuoteNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('QuoteNumber', QuoteNumberSchema);
