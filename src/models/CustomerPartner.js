const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery } = require('./preHooks/validate');

const CustomerPartnerSchema = mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  prescriber: { type: Boolean, default: false },
}, { timestamps: true });

CustomerPartnerSchema.pre('find', validateQuery);
CustomerPartnerSchema.pre('countDocuments', formatQuery);
CustomerPartnerSchema.pre('find', formatQuery);
CustomerPartnerSchema.pre('findOne', formatQuery);
CustomerPartnerSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('CustomerPartner', CustomerPartnerSchema);
