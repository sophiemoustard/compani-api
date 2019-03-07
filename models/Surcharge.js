const mongoose = require('mongoose');

const SurchargeSchema = mongoose.Schema({
  name: String,
  saturdays: Number,
  sundays: Number,
  publicHolidays: Number,
  christmas: Number,
  laborDay: Number,
  evenings: Number,
  eveningsStartTime: Date,
  eveningsEndTime: Date,
  customs: Number,
  customsStartTime: Date,
  customsEndTime: Date,
  service: mongoose.Schema.Types.ObjectId,
  company: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('Surcharge', SurchargeSchema);
