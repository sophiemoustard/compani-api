const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');
const { validatePayload } = require('./preHooks/validate');

const FinalPaySchema = mongoose.Schema({
  ...paySchemaDefinition,
  endNotificationDate: Date,
  endReason: String,
  compensation: Number,
}, { timestamps: true });

FinalPaySchema.pre('validate', validatePayload);

module.exports = mongoose.model('FinalPay', FinalPaySchema);
