const mongoose = require('mongoose');

const CreditNoteSchema = mongoose.Schema({
  number: String,
  date: Date,
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
    vat: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', CreditNoteSchema);
