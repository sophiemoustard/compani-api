const mongoose = require('mongoose');

const billEventSurchargesSchemaDefinition = [{
  percentage: { type: Number, required: true },
  name: { type: String, required: true },
  startHour: { type: Date },
  endHour: { type: Date },
}];

const billingItemsDefinition = {
  billingItem: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingItem', required: true },
  unitInclTaxes: { type: String, required: true },
  name: { type: String, required: true },
  count: { type: Number, required: true },
  inclTaxes: { type: Number, required: true },
  exclTaxes: { type: String, required: true },
  vat: { type: Number, required: true },
};

const billingItemsInCreditNoteDefinition = billingItemsDefinition;

const billingItemsInBillDefinition = {
  ...billingItemsDefinition,
  discount: { type: String, default: '0' },
  startDate: { type: Date },
  endDate: { type: Date },
  events: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
    auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  }],
};

const billingItemsInEventDefinition = [{
  billingItem: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingItem', required: true },
  exclTaxes: { type: String, required: true },
  inclTaxes: { type: Number, required: true },
}];

module.exports = {
  billEventSurchargesSchemaDefinition,
  billingItemsInCreditNoteDefinition,
  billingItemsInEventDefinition,
  billingItemsInBillDefinition,
};
