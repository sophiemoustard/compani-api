const mongoose = require('mongoose');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const { validateQuery, validateAggregation } = require('./preHooks/validate');

const PartnerOrganizationSchema = mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: mongoose.Schema(addressSchemaDefinition, { id: false, _id: false }) },
  email: { type: String },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

PartnerOrganizationSchema.virtual(
  'partners',
  { ref: 'Partner', localField: '_id', foreignField: 'partnerOrganization' }
);

PartnerOrganizationSchema.pre('find', validateQuery);
PartnerOrganizationSchema.pre('findOne', validateQuery);
PartnerOrganizationSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('PartnerOrganization', PartnerOrganizationSchema);
