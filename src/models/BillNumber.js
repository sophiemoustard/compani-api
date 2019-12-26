const mongoose = require('mongoose');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');

const BillNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1, required: true },
  company: { type: mongoose.Types.ObjectId, required: true },
}, { timestamps: true });

BillNumberSchema.pre('validate', validatePayload);
BillNumberSchema.pre('find', validateQuery);
BillNumberSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('BillNumber', BillNumberSchema);
