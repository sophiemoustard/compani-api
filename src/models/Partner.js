const mongoose = require('mongoose');
const {
  SOCIAL_WORKER,
  MEDICO_SOCIAL_ASSESSOR,
  DOCTOR,
  GERIATRICIAN,
  COORDINATOR,
  DIRECTOR,
  CASE_MANAGER,
  NURSE,
  PSYCHOLOGIST,
} = require('../helpers/constants');
const { validateQuery, validateAggregation } = require('./preHooks/validate');

const JOBS = [
  SOCIAL_WORKER,
  MEDICO_SOCIAL_ASSESSOR,
  DOCTOR,
  GERIATRICIAN,
  COORDINATOR,
  DIRECTOR,
  CASE_MANAGER,
  NURSE,
  PSYCHOLOGIST,
  '',
];

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
