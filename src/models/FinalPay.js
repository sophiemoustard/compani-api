const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validatePayload, validateQuery } = require('./preHooks/validate');

const FinalPaySchema = mongoose.Schema({
  ...paySchemaDefinition,
  endNotificationDate: Date,
  endReason: String,
  compensation: Number,
}, { timestamps: true });

FinalPaySchema.pre('validate', validatePayload);
FinalPaySchema.pre('find', validateQuery);

module.exports = mongoose.model('FinalPay', FinalPaySchema);
