const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CustomerPartnerSchema = mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  prescriber: { type: Boolean, default: false },
}, { timestamps: true });

CustomerPartnerSchema.pre('find', validateQuery);
CustomerPartnerSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => CustomerPartnerSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CustomerPartner', CustomerPartnerSchema);
