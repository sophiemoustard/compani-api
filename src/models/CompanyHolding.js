const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CompanyHoldingSchema = mongoose.Schema({
  holding: { type: mongoose.Schema.Types.ObjectId, ref: 'Holding', required: true, immutable: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => CompanyHoldingSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CompanyHolding', CompanyHoldingSchema);
