const mongoose = require('mongoose');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const PartnerOrganizationSchema = mongoose.Schema({
  /*  unique mongo index on both keys 'name' and 'company' (with case and diacritics insensitive collation)
      has been added manually in mep58 */
  name: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  phone: { type: String },
  address: { type: mongoose.Schema(addressSchemaDefinition, { id: false, _id: false }) },
  email: { type: String },
}, { timestamps: true });

PartnerOrganizationSchema.virtual(
  'partners',
  { ref: 'Partner', localField: '_id', foreignField: 'partnerOrganization' }
);

PartnerOrganizationSchema.pre('find', validateQuery);
PartnerOrganizationSchema.pre('findOne', validateQuery);
PartnerOrganizationSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => PartnerOrganizationSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('PartnerOrganization', PartnerOrganizationSchema);
