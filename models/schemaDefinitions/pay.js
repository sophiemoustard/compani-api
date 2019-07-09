const mongoose = require('mongoose');

module.exports = {
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: Date,
  endDate: Date,
  month: String,
  contractHours: Number,
  workedHours: Number,
  notSurchargedAndNotExempt: Number,
  surchargedAndNotExempt: Number,
  notSurchargedAndExempt: Number,
  surchargedAndExempt: Number,
  hoursBalance: Number,
  hoursCounter: Number,
  overtimeHours: Number,
  additionalHours: Number,
  mutual: Boolean,
  transport: Number,
  otherFees: Number,
  bonus: Number,
};
