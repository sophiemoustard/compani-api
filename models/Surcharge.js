const mongoose = require('mongoose');

const SurchargeSchema = mongoose.Schema({
  name: String,
  saterdays: Number,
  sundays: Number,
  publicHolidays: Number,
  christmas: Number,
  laborDay: Number,
  evenings: Number,
  eveningsStartTime: Date,
  eveningsEndTime: Date,
  custom: Number,
  customStartTime: Date,
  customeEndTime: Date,
  service: mongoose.Schema.Types.ObjectId,
  company: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

module.exports = mongoose.model('Surcharge', SurchargeSchema);
