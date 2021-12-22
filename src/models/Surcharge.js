const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery } = require('./preHooks/validate');

const SurchargeSchema = mongoose.Schema({
  name: { type: String, required: true },
  firstOfJanuary: { type: Number, default: 0 },
  firstOfMay: { type: Number, default: 0 },
  twentyFifthOfDecember: { type: Number, default: 0 },
  publicHoliday: { type: Number, default: 0 },
  saturday: { type: Number, default: 0 },
  sunday: { type: Number, default: 0 },
  evening: { type: Number, default: 0 },
  eveningStartTime: { type: String },
  eveningEndTime: { type: String },
  custom: { type: Number, default: 0 },
  customStartTime: { type: String },
  customEndTime: { type: String },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

SurchargeSchema.pre('find', validateQuery);
SurchargeSchema.pre('countDocuments', formatQuery);
SurchargeSchema.pre('find', formatQuery);
SurchargeSchema.pre('findOne', formatQuery);
SurchargeSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('Surcharge', SurchargeSchema);
