const mongoose = require('mongoose');
const { COMPANI, OGUST } = require('../helpers/constants');
const { SERVICE_NATURES } = require('./Service');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const billEventSurchargesSchemaDefinition = require('./schemaDefinitions/billEventSurcharges');

const CREDIT_NOTE_ORIGINS = [COMPANI, OGUST];

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
    serviceName: String,
    startDate: { type: Date },
    endDate: { type: Date },
    bills: {
      inclTaxesCustomer: Number,
      exclTaxesCustomer: Number,
      thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId },
      inclTaxesTpp: Number,
      exclTaxesTpp: Number,
      fundingId: { type: mongoose.Schema.Types.ObjectId },
      nature: String,
      careHours: Number,
      surcharges: billEventSurchargesSchemaDefinition,
    },
  }],
  subscription: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    service: {
      serviceId: { type: mongoose.Schema.Types.ObjectId },
      nature: { type: String, enum: SERVICE_NATURES, required: !!this.serviceId },
      name: String,
    },
    vat: Number,
    unitInclTaxes: Number,
  },
  linkedCreditNote: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote' },
  origin: { type: String, enum: CREDIT_NOTE_ORIGINS, default: COMPANI },
  driveFile: driveResourceSchemaDefinition,
}, { timestamps: true });

module.exports = mongoose.model('CreditNote', CreditNoteSchema);
module.exports.CREDIT_NOTE_ORIGINS = CREDIT_NOTE_ORIGINS;
