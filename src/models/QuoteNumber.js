const mongoose = require('mongoose');
const { validateQuery, validateAggregation, validateUpdateOne } = require('./preHooks/validate');

const QuoteNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

QuoteNumberSchema.pre('find', validateQuery);
QuoteNumberSchema.pre('aggregate', validateAggregation);
QuoteNumberSchema.pre('updateOne', validateUpdateOne);

module.exports = mongoose.model('QuoteNumber', QuoteNumberSchema);
