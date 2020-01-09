const mongoose = require('mongoose');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');

const QuoteNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Types.ObjectId, required: true },
});

QuoteNumberSchema.pre('validate', validatePayload);
QuoteNumberSchema.pre('find', validateQuery);
QuoteNumberSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('QuoteNumber', QuoteNumberSchema);
