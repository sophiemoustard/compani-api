const mongoose = require('mongoose');
const { MANUAL, PER_INTERVENTION } = require('../helpers/constants');
const {
  validateQuery,
  validateAggregation,
  validateUpdateOne,
  formatQuery,
  queryMiddlewareList,
} = require('./preHooks/validate');

const BILLING_ITEM_TYPES = [MANUAL, PER_INTERVENTION];

const BillingItemSchema = mongoose.Schema({
  /*  unique mongo index on both keys 'name' and 'company' (with case and diacritics insensitive collation)
      has been added manually in mep58 */
  name: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
  type: { type: String, enum: BILLING_ITEM_TYPES, required: true, immutable: true },
  defaultUnitAmount: { type: Number, required: true },
  vat: { type: Number, required: true },
}, { timestamps: true });

BillingItemSchema.pre('find', validateQuery);
BillingItemSchema.pre('aggregate', validateAggregation);
BillingItemSchema.pre('updateOne', validateUpdateOne);
queryMiddlewareList.map(middleware => BillingItemSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('BillingItem', BillingItemSchema);
module.exports.BILLING_ITEM_TYPES = BILLING_ITEM_TYPES;
