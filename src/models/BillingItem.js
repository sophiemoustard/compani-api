const mongoose = require('mongoose');
const { MANUAL, PER_INTERVENTION } = require('../helpers/constants');

const BILLING_ITEM_TYPES = [MANUAL, PER_INTERVENTION];

const BillingItemSchema = mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: BILLING_ITEM_TYPES, required: true },
  defaultUnitAmount: { type: Number, required: true },
  vat: { type: Number, default: 0 },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

module.exports = mongoose.model('BillingItem', BillingItemSchema);
