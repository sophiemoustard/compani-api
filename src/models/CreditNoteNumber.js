const mongoose = require('mongoose');
const { validateQuery, validateAggregation, validateUpdateOne, formatQuery } = require('./preHooks/validate');

const CreditNoteNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

CreditNoteNumberSchema.pre('find', validateQuery);
CreditNoteNumberSchema.pre('countDocuments', formatQuery);
CreditNoteNumberSchema.pre('find', formatQuery);
CreditNoteNumberSchema.pre('findOne', formatQuery);
CreditNoteNumberSchema.pre('aggregate', validateAggregation);
CreditNoteNumberSchema.pre('updateOne', validateUpdateOne);

module.exports = mongoose.model('CreditNoteNumber', CreditNoteNumberSchema);
