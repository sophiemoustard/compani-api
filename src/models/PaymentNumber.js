const mongoose = require('mongoose');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');
const { REFUND, PAYMENT } = require('../helpers/constants');

const PaymentNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  nature: { type: String, enum: [REFUND, PAYMENT], required: true },
  company: { type: mongoose.Types.ObjectId, required: true },
});

PaymentNumberSchema.pre('validate', validatePayload);
PaymentNumberSchema.pre('find', validateQuery);
PaymentNumberSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('PaymentNumber', PaymentNumberSchema);
