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
  surchargedAndNotExemptDetails: Object, // TODO: à préciser
  notSurchargedAndExempt: Number,
  surchargedAndExempt: Number,
  surchargedAndExemptDetails: Object, // TODO: à préciser
  hoursBalance: Number,
  hoursCounter: Number,
  overtimeHours: Number,
  additionnalHours: Number,
  mutual: Boolean,
  transport: Number,
  otherFees: Number,
  bonus: Number,
}, { timestamps: true });

module.exports = mongoose.model('Pay', PaySchema);
