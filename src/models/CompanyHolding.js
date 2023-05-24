const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CompanyHoldingSchema = mongoose.Schema({
  holding: { type: mongoose.Schema.Types.ObjectId, ref: 'Holding', required: true, immutable: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
}, { timestamps: true });

CompanyHoldingSchema.pre('find', validateQuery);
CompanyHoldingSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => CompanyHoldingSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CompanyHolding', CompanyHoldingSchema);
