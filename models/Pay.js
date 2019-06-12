const mongoose = require('mongoose');

const surchargedHoursSchema = {
  hours: Number,
  percentage: Number,
};

const surchargedDetailsSchema = [{
  planName: String,
  saturday: surchargedHoursSchema,
  sunday: surchargedHoursSchema,
  publicHoliday: surchargedHoursSchema,
  twentyFifthOfDecember: surchargedHoursSchema,
  firstOfMay: surchargedHoursSchema,
  evening: surchargedHoursSchema,
  custom: surchargedHoursSchema,
}];

const PaySchema = mongoose.Schema({
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: Date,
  endDate: Date,
  month: String,
  contractHours: Number,
  workedHours: Number,
  notSurchargedAndNotExempt: Number,
  surchargedAndNotExempt: Number,
  surchargedAndNotExemptDetails: surchargedDetailsSchema,
  notSurchargedAndExempt: Number,
  surchargedAndExempt: Number,
  surchargedAndExemptDetails: surchargedDetailsSchema,
  hoursBalance: Number,
  hoursCounter: Number,
  overtimeHours: Number,
  additionalHours: Number,
  mutual: Boolean,
  transport: Number,
  otherFees: Number,
  bonus: Number,
}, { timestamps: true });

module.exports = mongoose.model('Pay', PaySchema);
