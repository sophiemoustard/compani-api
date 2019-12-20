const mongoose = require('mongoose');
const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const SurchargeSchema = mongoose.Schema({
  name: String,
  saturday: Number,
  sunday: Number,
  publicHoliday: Number,
  twentyFifthOfDecember: Number,
  firstOfMay: Number,
  evening: Number,
  eveningStartTime: String,
  eveningEndTime: String,
  custom: Number,
  customStartTime: String,
  customEndTime: String,
  company: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

SurchargeSchema.pre('validate', validatePayload);
SurchargeSchema.pre('find', validateQuery);
SurchargeSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('Surcharge', SurchargeSchema);
