const mongoose = require('mongoose');
const {
  validateQuery,
  validateAggregation,
  validateUpdateOne,
  formatQuery,
  formatQueryMiddlewareList,
} = require('./preHooks/validate');
const { REFUND, PAYMENT } = require('../helpers/constants');

const PaymentNumberSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  nature: { type: String, enum: [REFUND, PAYMENT], required: true },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

PaymentNumberSchema.pre('find', validateQuery);
PaymentNumberSchema.pre('aggregate', validateAggregation);
PaymentNumberSchema.pre('updateOne', validateUpdateOne);
formatQueryMiddlewareList().map(middleware => PaymentNumberSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('PaymentNumber', PaymentNumberSchema);
