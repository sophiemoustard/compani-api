const mongoose = require('mongoose');
const { COMPANI, THIRD_PARTY, OGUST, FIXED, HOURLY } = require('../helpers/constants');

const BillSchema = mongoose.Schema({
  billNumber: String,
  date: Date,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
  subscriptions: [{
    startDate: Date,
    endDate: Date,
    subscription: { type: mongoose.Schema.Types.ObjectId },
    service: {
      serviceId: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      nature: { type: String, enum: [FIXED, HOURLY] },
    },
    vat: Number,
    events: [{
      eventId: { type: mongoose.Schema.Types.ObjectId },
      auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      startDate: Date,
      endDate: Date,
    }],
    hours: Number,
    unitInclTaxes: Number,
    exclTaxes: Number,
    inclTaxes: Number,
    discount: Number,
  }],
  origin: { type: String, enum: [COMPANI, THIRD_PARTY, OGUST], default: COMPANI },
  netInclTaxes: Number,
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);
