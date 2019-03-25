const mongoose = require('mongoose');

const CreditNoteSchema = mongoose.Schema({
  number: Number,
  startDate: Date,
  endDate: Date,
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  thirdPartyPayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ThirdPartyPayer',
  },
  exclTaxes: Number,
  inclTaxes: Number,
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
  subscription: {
    service: String,
    unitTTCRate: Number,
    estimatedWeeklyVolume: Number,
    evenings: Number,
    sundays: Number,
    startDate: Date,
  }
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', CreditNoteSchema);
