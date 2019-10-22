const mongoose = require('mongoose');

const surchargedHours = {
  hours: Number,
  percentage: Number,
};

const surchargedDetails = [{
  planName: String,
  planId: { type: mongoose.Schema.Types.ObjectId },
  saturday: surchargedHours,
  sunday: surchargedHours,
  publicHoliday: surchargedHours,
  twentyFifthOfDecember: surchargedHours,
  firstOfMay: surchargedHours,
  evening: surchargedHours,
  custom: surchargedHours,
}];

module.exports = {
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: Date,
  endDate: Date,
  month: String,
  contractHours: Number,
  workedHours: Number,
  notSurchargedAndNotExempt: Number,
  surchargedAndNotExempt: Number,
  surchargedAndNotExemptDetails: surchargedDetails,
  notSurchargedAndExempt: Number,
  surchargedAndExempt: Number,
  surchargedAndExemptDetails: surchargedDetails,
  hoursBalance: Number,
  hoursCounter: Number,
  overtimeHours: Number,
  additionalHours: Number,
  mutual: Boolean,
  transport: Number,
  otherFees: Number,
  bonus: Number,
};
