const mongoose = require('mongoose');
const {
  validatePayload,
  validateQuery,
  validateAggregation,
  validateUpdateOne,
} = require('./preHooks/validate');

const CreditNoteNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

CreditNoteNumberSchema.pre('validate', validatePayload);
CreditNoteNumberSchema.pre('find', validateQuery);
CreditNoteNumberSchema.pre('aggregate', validateAggregation);
CreditNoteNumberSchema.pre('updateOne', validateUpdateOne);

module.exports = mongoose.model('CreditNoteNumber', CreditNoteNumberSchema);
