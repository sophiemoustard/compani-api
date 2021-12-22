const mongoose = require('mongoose');

const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const {
  OTHER,
  PAYSLIP,
  CERTIFICATE,
} = require('../helpers/constants');
const { validateQuery, validateAggregation, formatQuery } = require('./preHooks/validate');

const PAY_DOCUMENT_NATURES = [PAYSLIP, CERTIFICATE, OTHER];

const PayDocumentSchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  user: { type: mongoose.Schema.Types.ObjectId },
  nature: { type: String, enum: PAY_DOCUMENT_NATURES, default: OTHER },
  date: { type: Date },
  file: driveResourceSchemaDefinition,
}, { timestamps: true });

PayDocumentSchema.pre('find', validateQuery);
PayDocumentSchema.pre('countDocuments', formatQuery);
PayDocumentSchema.pre('find', formatQuery);
PayDocumentSchema.pre('findOne', formatQuery);
PayDocumentSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('PayDocument', PayDocumentSchema);
module.exports.PAY_DOCUMENT_NATURES = PAY_DOCUMENT_NATURES;
