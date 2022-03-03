const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const addressSchemaDefinition = require('./schemaDefinitions/address');

const CourseFundingOrganisationSchema = mongoose.Schema({
  // unique mongo index on 'name' (with case and diacritics insensitive collation) has been added manually in mep58
  name: { type: String, required: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }), required: true },
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => CourseFundingOrganisationSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseFundingOrganisation', CourseFundingOrganisationSchema);
