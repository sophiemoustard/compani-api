const mongoose = require('mongoose');

const BillSchema = mongoose.Schema({
  billNumber: String,
  customer: { type: mongoose.Schema.Types.ObjectId },
  client: { type: mongoose.Schema.Types.ObjectId },
  subscriptions: [{
    startDate: Date,
    endDate: Date,
    subscription: { type: mongoose.Schema.Types.ObjectId },
    vat: Number,
    events: [{ type: mongoose.Schema.Types.ObjectId }],
    hours: Number,
    unitExclTaxes: Number,
    exclTaxes: Number,
    inclTaxes: Number,
    discount: Number,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);
