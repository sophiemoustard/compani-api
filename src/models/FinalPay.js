const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');

const FinalPaySchema = mongoose.Schema({
  ...paySchemaDefinition,
  endNotificationDate: Date,
  endReason: String,
  compensation: Number,
}, { timestamps: true });

FinalPaySchema.pre('validate', validatePayload);
FinalPaySchema.pre('find', validateQuery);
FinalPaySchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('FinalPay', FinalPaySchema);
