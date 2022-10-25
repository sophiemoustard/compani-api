const mongoose = require('mongoose');
const get = require('lodash/get');
const { COMPANI, OGUST } = require('../helpers/constants');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const {
  billEventSurchargesSchemaDefinition,
  billingItemsInEventDefinition,
  billingItemsInCreditNoteDefinition,
} = require('./schemaDefinitions/billing');
const { SERVICE_NATURES } = require('./Service');
const { validateQuery, validateAggregation, formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CREDIT_NOTE_ORIGINS = [COMPANI, OGUST];

const CreditNoteSchema = mongoose.Schema(
  {
    number: { type: String },
    date: { type: Date, required: true },
    startDate: { type: Date },
    endDate: { type: Date },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, immutable: true },
    thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer', immutable: true },
    exclTaxesCustomer: { type: String, required() { return !this.thirdPartyPayer; } },
    inclTaxesCustomer: { type: Number, required() { return !this.thirdPartyPayer; } },
    exclTaxesTpp: { type: String, required() { return !!this.thirdPartyPayer; } },
    inclTaxesTpp: { type: Number, required() { return !!this.thirdPartyPayer; } },
    events: [
      {
        eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
        auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        serviceName: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        bills: {
          type: mongoose.Schema(
            {
              inclTaxesCustomer: { type: String },
              exclTaxesCustomer: { type: String },
              thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId },
              inclTaxesTpp: { type: String },
              exclTaxesTpp: { type: String },
              fundingId: { type: mongoose.Schema.Types.ObjectId },
              nature: { type: String },
              careHours: { type: String },
              surcharges: billEventSurchargesSchemaDefinition,
              billingItems: billingItemsInEventDefinition,
            },
            { id: false }
          ),
          required: true,
        },
      },
    ],
    subscription: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      service: {
        serviceId: { type: mongoose.Schema.Types.ObjectId },
        nature: {
          type: String,
          enum: SERVICE_NATURES,
          required() { return get(this.subscription, 'service.serviceId', false); },
        },
        name: { type: String, required() { return get(this.subscription, 'service.serviceId', false); } },
      },
      vat: { type: Number },
      unitInclTaxes: { type: Number },
    },
    linkedCreditNote: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditNote', immutable: true },
    origin: { type: String, enum: CREDIT_NOTE_ORIGINS, default: COMPANI, immutable: true },
    driveFile: driveResourceSchemaDefinition,
    company: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    isEditable: { type: Boolean, default: true },
    misc: { type: String },
    billingItemList: {
      type: [billingItemsInCreditNoteDefinition],
      required() { return !this.events && !this.subscription; },
      default: undefined,
    },
  },
  { timestamps: true }
);

CreditNoteSchema.pre('find', validateQuery);
CreditNoteSchema.pre('aggregate', validateAggregation);
queryMiddlewareList.map(middleware => CreditNoteSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CreditNote', CreditNoteSchema);
module.exports.CREDIT_NOTE_ORIGINS = CREDIT_NOTE_ORIGINS;
