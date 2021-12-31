const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const PaySchema = mongoose.Schema(paySchemaDefinition, { timestamps: true });

PaySchema.pre('find', validateQuery);
PaySchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => PaySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Pay', PaySchema);
