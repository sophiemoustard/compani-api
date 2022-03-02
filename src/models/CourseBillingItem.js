const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseBillingItemSchema = mongoose.Schema({
  name: { type: String, required: true },
  // unique mongo index on 'name' (with case and diacritics insensitive collation) has been added manually in mep58
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => CourseBillingItemSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseBillingItem', CourseBillingItemSchema);
