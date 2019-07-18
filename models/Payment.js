const mongoose = require('mongoose');

const {
  PAYMENT,
  REFUND,
  DIRECT_DEBIT,
  BANK_TRANSFER,
  CHECK,
  CESU,
} = require('../helpers/constants');

const PAYMENT_NATURES = [REFUND, PAYMENT];
const PAYMENT_TYPES = [DIRECT_DEBIT, BANK_TRANSFER, CHECK, CESU];

const PaymentSchema = mongoose.Schema({
  number: String,
  date: { type: Date, default: Date.now },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
  netInclTaxes: Number,
  nature: { type: String, enum: PAYMENT_NATURES },
  type: { type: String, enum: PAYMENT_TYPES },
  rum: String,

}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
module.exports.PAYMENT_NATURES = PAYMENT_NATURES;
module.exports.PAYMENT_TYPES = PAYMENT_TYPES;
