const mongoose = require('mongoose');

const surchargedHours = {
  hours: { type: Number },
  percentage: { type: Number, required: () => !!this.hours, min: 0, max: 100 },
};

const surchargedDetails = [{
  planName: { type: String, required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Surcharge' },
  saturday: surchargedHours,
  sunday: surchargedHours,
  publicHoliday: surchargedHours,
  twentyFifthOfDecember: surchargedHours,
  firstOfMay: surchargedHours,
  firstOfJanuary: surchargedHours,
  evening: surchargedHours,
  custom: surchargedHours,
}];

const hoursBalanceDetails = {
  absencesHours: { type: Number, required: true },
  hoursBalance: { type: Number, required: true },
  internalHours: { type: Number, required: true },
  notSurchargedAndNotExempt: { type: Number, required: true },
  notSurchargedAndExempt: { type: Number, required: true },
  paidTransportHours: { type: Number, required: true },
  surchargedAndExempt: { type: Number, required: true },
  surchargedAndExemptDetails: surchargedDetails,
  surchargedAndNotExempt: { type: Number, required: true },
  surchargedAndNotExemptDetails: surchargedDetails,
  workedHours: { type: Number, required: true },
};

module.exports = {
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  additionalHours: { type: Number, min: 0, required: true },
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bonus: { type: Number, min: 0, required: true },
  contractHours: { type: Number, min: 0, required: true },
  diff: hoursBalanceDetails,
  endDate: { type: Date, required: true },
  ...hoursBalanceDetails,
  holidaysHours: { type: Number, required: true },
  hoursCounter: { type: Number, required: true },
  hoursToWork: { type: Number, min: 0, required: true },
  month: { type: String, required: true, validate: /^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/ },
  mutual: { type: Boolean, required: true },
  phoneFees: { type: Number, min: 0, required: true },
  overtimeHours: { type: Number, min: 0, required: true },
  startDate: { type: Date, required: true },
  transport: { type: Number, min: 0, required: true },
};
