const mongoose = require('mongoose');

const { PAYMENT, REFUND, PAYMENT_TYPES } = require('../helpers/constants');

const PaymentSchema = mongoose.Schema({
  number: String,
  date: { type: Date, default: Date.now },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
  netInclTaxes: Number,
  nature: { type: String, enum: [REFUND, PAYMENT] },
  type: { type: String, enum: PAYMENT_TYPES },
  rum: String,

}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
