const mongoose = require('mongoose');
const { validateQuery, validateAggregation } = require('./preHooks/validate');

const SurchargeSchema = mongoose.Schema({
  name: { type: String },
  saturday: { type: Number },
  sunday: { type: Number },
  publicHoliday: { type: Number },
  twentyFifthOfDecember: { type: Number },
  firstOfMay: { type: Number },
  evening: { type: Number },
  eveningStartTime: { type: String },
  eveningEndTime: { type: String },
  custom: { type: Number },
  customStartTime: { type: String },
  customEndTime: { type: String },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

SurchargeSchema.pre('find', validateQuery);
SurchargeSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('Surcharge', SurchargeSchema);
