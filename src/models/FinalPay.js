const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const FinalPaySchema = mongoose.Schema({
  ...paySchemaDefinition,
  endNotificationDate: Date,
  endReason: String,
  compensation: Number,
}, { timestamps: true });

FinalPaySchema.pre('find', validateQuery);
FinalPaySchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => FinalPaySchema.pre(middleware, formatQuery));

module.exports = mongoose.model('FinalPay', FinalPaySchema);
