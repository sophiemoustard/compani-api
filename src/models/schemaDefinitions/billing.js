const mongoose = require('mongoose');

const billEventSurchargesSchemaDefinition = [{
  percentage: { type: Number, required: true },
  name: { type: String, required: true },
  startHour: Date,
  endHour: Date,
}];

const billingItemSchemaDefinition = {
  billingItem: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingItem', required: true },
  unitInclTaxes: { type: Number, required: true },
  name: { type: String, required: true },
  count: { type: Number, required: true },
  inclTaxes: { type: Number, required: true },
  exclTaxes: { type: Number, required: true },
  vat: { type: Number, required: true },
  startDate: Date,
  endDate: Date,
  events: Array,
};

module.exports = { billEventSurchargesSchemaDefinition, billingItemSchemaDefinition };
