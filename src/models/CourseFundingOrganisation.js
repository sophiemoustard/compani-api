const mongoose = require('mongoose');

const addressSchemaDefinition = require('./schemaDefinitions/address');

const CourseFundingOrganisationSchema = mongoose.Schema({
  name: { type: String, unique: true, required: true },
  address: { type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }), required: true },
}, { timestamps: true });

module.exports = mongoose.model('CourseFundingOrganisation', CourseFundingOrganisationSchema);
