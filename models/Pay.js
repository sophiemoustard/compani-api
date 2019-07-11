const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');

const PaySchema = mongoose.Schema(paySchemaDefinition, { timestamps: true });

module.exports = mongoose.model('Pay', PaySchema);
