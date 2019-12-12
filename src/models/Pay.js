const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validatePayload, validateQuery } = require('./preHooks/validate');

const PaySchema = mongoose.Schema(paySchemaDefinition, { timestamps: true });

PaySchema.pre('validate', validatePayload);
PaySchema.pre('find', validateQuery);

module.exports = mongoose.model('Pay', PaySchema);
