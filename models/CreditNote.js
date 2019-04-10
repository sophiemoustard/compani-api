const mongoose = require('mongoose');

const CreditNoteSchema = mongoose.Schema({
  number: String,
  date: Date,
  startDate: Date,
  endDate: Date,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  exclTaxesCustomer: Number,
  inclTaxesCustomer: Number,
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
  subscription: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    service: String,
    vat: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', CreditNoteSchema);
