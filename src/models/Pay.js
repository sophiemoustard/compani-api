const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validateQuery, validateAggregation, formatQuery } = require('./preHooks/validate');

const PaySchema = mongoose.Schema(paySchemaDefinition, { timestamps: true });

PaySchema.pre('find', validateQuery);
PaySchema.pre('countDocuments', formatQuery);
PaySchema.pre('find', formatQuery);
PaySchema.pre('findOne', formatQuery);
PaySchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('Pay', PaySchema);
