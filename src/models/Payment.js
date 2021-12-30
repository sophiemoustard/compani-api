const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const {
  PAYMENT,
  REFUND,
  DIRECT_DEBIT,
  BANK_TRANSFER,
  CHECK,
  CESU,
  CASH,
} = require('../helpers/constants');

const PAYMENT_NATURES = [REFUND, PAYMENT];
const PAYMENT_TYPES = [DIRECT_DEBIT, BANK_TRANSFER, CHECK, CESU, CASH];

const PaymentSchema = mongoose.Schema({
  number: { type: String, unique: true },
  date: { type: Date, default: Date.now },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
  netInclTaxes: Number,
  nature: { type: String, enum: PAYMENT_NATURES },
  type: { type: String, enum: PAYMENT_TYPES },
  rum: String,

}, { timestamps: true });

PaymentSchema.pre('find', validateQuery);
PaymentSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => PaymentSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Payment', PaymentSchema);
module.exports.PAYMENT_NATURES = PAYMENT_NATURES;
module.exports.PAYMENT_TYPES = PAYMENT_TYPES;
