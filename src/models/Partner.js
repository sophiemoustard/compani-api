const mongoose = require('mongoose');
const { JOBS } = require('../helpers/constants');
const { validateQuery, validateAggregation } = require('./preHooks/validate');

const PartnerSchema = mongoose.Schema({
  identity: { type: mongoose.Schema({ firstname: { type: String }, lastname: { type: String, required: true } }) },
  email: { type: String },
  phone: { type: String },
  job: { type: String, enum: JOBS },
  partnerOrganization: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerOrganization', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

PartnerSchema.pre('find', validateQuery);
PartnerSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('Partner', PartnerSchema);
