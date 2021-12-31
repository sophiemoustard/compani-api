const mongoose = require('mongoose');

const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');

const AdministrativeDocumentSchema = mongoose.Schema({
  name: { type: String, required: true },
  driveFile: { type: driveResourceSchemaDefinition, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

AdministrativeDocumentSchema.pre('find', validateQuery);
AdministrativeDocumentSchema.pre('aggregate', validateAggregation);

formatQueryMiddlewareList().map(middleware => AdministrativeDocumentSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('AdministrativeDocument', AdministrativeDocumentSchema);
