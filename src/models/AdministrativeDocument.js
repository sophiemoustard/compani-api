const mongoose = require('mongoose');

const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const AdministrativeDocumentSchema = mongoose.Schema({
  name: { type: String, required: true },
  file: { type: String, default: '' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

AdministrativeDocumentSchema.pre('find', validateQuery);
AdministrativeDocumentSchema.pre('validate', validatePayload);
AdministrativeDocumentSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('AdministrativeDocument', AdministrativeDocumentSchema);
