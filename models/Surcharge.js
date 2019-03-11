const mongoose = require('mongoose');

const SurchargeSchema = mongoose.Schema({
  name: String,
  saturday: Number,
  sunday: Number,
  publicHoliday: Number,
  twentyFiveOfDecember: Number,
  firstOfMay: Number,
  evening: Number,
  eveningStartTime: Date,
  eveningEndTime: Date,
  custom: Number,
  customStartTime: Date,
  customEndTime: Date,
  company: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('Surcharge', SurchargeSchema);
