const mongoose = require('mongoose');

const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const {
  OTHER,
  PAYSLIP,
  CERTIFICATE,
} = require('../helpers/constants');

const PAY_DOCUMENT_NATURES = [PAYSLIP, CERTIFICATE, OTHER];

const PayDocumentSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId },
  nature: { type: String, enum: PAY_DOCUMENT_NATURES, default: OTHER },
  date: { type: Date },
  file: driveResourceSchemaDefinition,
}, { timestamps: true });

module.exports = mongoose.model('PayDocument', PayDocumentSchema);
module.exports.PAY_DOCUMENT_NATURES = PAY_DOCUMENT_NATURES;
