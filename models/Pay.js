const mongoose = require('mongoose');

const surchargedDetails = [{
  planName: String,
  surcharges: [{
    name: String,
    hours: Number,
    percentage: Number,
  }]
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
}, { timestamps: true });

module.exports = mongoose.model('Pay', PaySchema);
