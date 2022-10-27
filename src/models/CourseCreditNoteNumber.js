const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CourseCreditNoteNumberSchema = mongoose.Schema({
  seq: { type: Number, default: 1 },
}, { timestamps: true });

queryMiddlewareList.map(middleware => CourseCreditNoteNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseCreditNoteNumber', CourseCreditNoteNumberSchema);
