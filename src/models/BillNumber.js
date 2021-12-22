const mongoose = require('mongoose');
const { validateQuery, validateAggregation, validateUpdateOne, formatQuery } = require('./preHooks/validate');

const BillNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

BillNumberSchema.pre('find', validateQuery);
BillNumberSchema.pre('countDocuments', formatQuery);
BillNumberSchema.pre('find', formatQuery);
BillNumberSchema.pre('findOne', formatQuery);
BillNumberSchema.pre('aggregate', validateAggregation);
BillNumberSchema.pre('updateOne', validateUpdateOne);

module.exports = mongoose.model('BillNumber', BillNumberSchema);
