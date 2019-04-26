const mongoose = require('mongoose');

const BillSchema = mongoose.Schema({
  billNumber: String,
  date: Date,
  customer: { type: mongoose.Schema.Types.ObjectId },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
  subscriptions: [{
    startDate: Date,
    endDate: Date,
    subscription: { type: mongoose.Schema.Types.ObjectId },
    service: String,
    vat: Number,
    events: [{ type: mongoose.Schema.Types.ObjectId }],
    hours: Number,
    unitExclTaxes: Number,
    exclTaxes: Number,
    inclTaxes: Number,
    discount: Number,
  }],
  netInclTaxes: Number,
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);
