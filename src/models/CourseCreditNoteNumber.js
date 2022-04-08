const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseCreditNoteNumberSchema = mongoose.Schema({
  seq: { type: Number, default: 1 },
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => CourseCreditNoteNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseCreditNoteNumber', CourseCreditNoteNumberSchema);
