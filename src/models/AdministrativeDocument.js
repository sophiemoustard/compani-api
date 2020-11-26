const mongoose = require('mongoose');

const { validateQuery, validateAggregation } = require('./preHooks/validate');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');

const AdministrativeDocumentSchema = mongoose.Schema({
  name: { type: String, required: true },
  driveFile: { type: driveResourceSchemaDefinition, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

AdministrativeDocumentSchema.pre('find', validateQuery);
AdministrativeDocumentSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('AdministrativeDocument', AdministrativeDocumentSchema);
