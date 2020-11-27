const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validateQuery, validateAggregation } = require('./preHooks/validate');

const PaySchema = mongoose.Schema(paySchemaDefinition, { timestamps: true });

PaySchema.pre('find', validateQuery);
PaySchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('Pay', PaySchema);
