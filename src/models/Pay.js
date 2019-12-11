const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validatePayload } = require('./preHooks/validate');

const PaySchema = mongoose.Schema(paySchemaDefinition, { timestamps: true });

PaySchema.pre('validate', validatePayload);

module.exports = mongoose.model('Pay', PaySchema);
