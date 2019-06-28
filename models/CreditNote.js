const mongoose = require('mongoose');
const { COMPANI, OGUST } = require('../helpers/constants');

const ServiceSchema = require('./Service').schema;

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
    eventId: { type: mongoose.Schema.Types.ObjectId },
    auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startDate: { type: Date },
    endDate: { type: Date },
    bills: {
      inclTaxesCustomer: Number,
      exclTaxesCustomer: Number,
      thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId },
      inclTaxesTpp: Number,
      exclTaxesTpp: Number,
      fundingVersion: { type: mongoose.Schema.Types.ObjectId },
      nature: String,
      careHours: Number,
    },
  }],
  subscription: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    service: {
      serviceId: { type: mongoose.Schema.Types.ObjectId },
      nature: ServiceSchema.path('nature'),
      name: { type: String },
    },
    vat: Number,
    unitInclTaxes: Number,
  },
  linkedCreditNote: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote' },
  origin: { type: String, enum: [COMPANI, OGUST], default: COMPANI },
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', CreditNoteSchema);
