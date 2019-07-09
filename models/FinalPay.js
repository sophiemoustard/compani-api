const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');

const FinalPaySchema = mongoose.Schema({
  ...paySchemaDefinition,
  surchargedAndNotExemptDetails: String,
  surchargedAndExemptDetails: String,
  endNotificationDate: Date,
  endReason: String,
  endDate: Date,
  compensation: Number,
}, { timestamps: true });

module.exports = mongoose.model('FinalPay', FinalPaySchema);
