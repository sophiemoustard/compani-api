const mongoose = require('mongoose');
const {
  validateQuery,
  validateAggregation,
  validateUpdateOne,
  formatQuery,
  queryMiddlewareList,
} = require('./preHooks/validate');

const CreditNoteNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

CreditNoteNumberSchema.pre('find', validateQuery);
CreditNoteNumberSchema.pre('aggregate', validateAggregation);
CreditNoteNumberSchema.pre('updateOne', validateUpdateOne);
queryMiddlewareList.map(middleware => CreditNoteNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CreditNoteNumber', CreditNoteNumberSchema);
