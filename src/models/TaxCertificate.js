const mongoose = require('mongoose');
const { validateAggregation, validatePayload, validateQuery } = require('./preHooks/validate');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');

const TaxCertificateSchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  year: { type: String, required: true, validate: /^[2]{1}[0]{1}[0-9]{2}$/ },
  date: { type: Date, required: true, default: Date.now },
  driveFile: driveResourceSchemaDefinition,
}, { timestamps: true });

TaxCertificateSchema.pre('validate', validatePayload);
TaxCertificateSchema.pre('find', validateQuery);
TaxCertificateSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('TaxCertificate', TaxCertificateSchema);
