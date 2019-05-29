const mongoose = require('mongoose');

const CreditNoteSchema = mongoose.Schema({
  number: String,
  date: Date,
  startDate: Date,
  endDate: Date,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
  exclTaxesCustomer: Number,
  inclTaxesCustomer: Number,
  exclTaxesTpp: Number,
  inclTaxesTpp: Number,
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
  subscription: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    service: String,
    vat: Number,
    unitInclTaxes: Number,
  },
  linkedCreditNote: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote' }
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', CreditNoteSchema);
