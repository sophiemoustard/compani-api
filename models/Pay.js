const mongoose = require('mongoose');

const PaySchema = mongoose.Schema({
  auxiliary: { type: mongoose.Schema.Types.ObjectId, Ref: 'User' },
  startDate: Date,
  endDate: Date,
  month: String,
  contractHours: Number,
  workedHours: Number,
  notSurchargedAndNotExempt: Number,
  surchargedAndNotExempt: Number,
  surchargedAndNotExemptDetails: String,
  notSurchargedAndExempt: Number,
  surchargedAndExempt: Number,
  surchargedAndExemptDetails: String,
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
