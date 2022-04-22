const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseCreditNoteSchema = mongoose.Schema({
  number: { type: String, required: true, immutable: true, unique: true },
  courseBill: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseBill', required: true, immutable: true },
  misc: { type: String },
  date: { type: Date, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
}, { timestamps: true });

CourseCreditNoteSchema.pre('find', validateQuery);
CourseCreditNoteSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => CourseCreditNoteSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseCreditNote', CourseCreditNoteSchema);
