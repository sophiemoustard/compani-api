const mongoose = require('mongoose');
const ServiceSchema = require('./Service').schema;
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const { COMPANI, THIRD_PARTY, OGUST } = require('../helpers/constants');
const billEventSurchargesSchemaDefinition = require('./schemaDefinitions/billEventSurcharges');

const BILL_ORIGINS = [COMPANI, THIRD_PARTY, OGUST];

const BillSchema = mongoose.Schema({
  number: String,
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
      nature: ServiceSchema.path('nature'),
    },
    vat: Number,
    events: [{
      eventId: { type: mongoose.Schema.Types.ObjectId },
      auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      startDate: Date,
      endDate: Date,
      surcharges: billEventSurchargesSchemaDefinition,
    }],
    hours: Number,
    unitInclTaxes: Number,
    exclTaxes: Number,
    inclTaxes: Number,
    discount: Number,
  }],
  origin: { type: String, enum: BILL_ORIGINS, default: COMPANI },
  netInclTaxes: Number,
  driveFile: driveResourceSchemaDefinition,
}, { timestamps: true });

module.exports = mongoose.model('Bill', BillSchema);
module.exports.BILL_ORIGINS = BILL_ORIGINS;
