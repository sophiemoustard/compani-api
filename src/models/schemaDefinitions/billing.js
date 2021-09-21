const mongoose = require('mongoose');

const billEventSurchargesSchemaDefinition = [{
  percentage: { type: Number, required: true },
  name: { type: String, required: true },
  startHour: { type: Date },
  endHour: { type: Date },
}];

const billingItemSchemaDefinition = {
  billingItem: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingItem', required: true },
  unitInclTaxes: { type: Number, required: true },
  name: { type: String, required: true },
  count: { type: Number, required: true },
  inclTaxes: { type: Number, required: true },
  exclTaxes: { type: Number, required: true },
  vat: { type: Number, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  events: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, required: true },
    auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  }],
};

module.exports = { billEventSurchargesSchemaDefinition, billingItemSchemaDefinition };
