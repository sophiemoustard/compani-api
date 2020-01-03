const mongoose = require('mongoose');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');

const BillSlipNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Types.ObjectId, required: true },
}, { timestamps: true });

BillSlipNumberSchema.pre('validate', validatePayload);
BillSlipNumberSchema.pre('find', validateQuery);
BillSlipNumberSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('BillSlipNumber', BillSlipNumberSchema);

