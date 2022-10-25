const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const PaySchema = mongoose.Schema(paySchemaDefinition, { timestamps: true });

PaySchema.pre('find', validateQuery);
PaySchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => PaySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Pay', PaySchema);
