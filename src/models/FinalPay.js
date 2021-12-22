const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validateQuery, validateAggregation, formatQuery } = require('./preHooks/validate');

const FinalPaySchema = mongoose.Schema({
  ...paySchemaDefinition,
  endNotificationDate: Date,
  endReason: String,
  compensation: Number,
}, { timestamps: true });

FinalPaySchema.pre('find', validateQuery);
FinalPaySchema.pre('countDocuments', formatQuery);
FinalPaySchema.pre('find', formatQuery);
FinalPaySchema.pre('findOne', formatQuery);
FinalPaySchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('FinalPay', FinalPaySchema);
