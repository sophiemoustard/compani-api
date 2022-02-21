const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseBillingItemSchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => CourseBillingItemSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseBillingItem', CourseBillingItemSchema);
