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
  count: { type: Number, required: true },
  inclTaxes: { type: Number, required: true },
  exclTaxes: { type: Number, required: true },
};

module.exports = { billEventSurchargesSchemaDefinition, billingItemSchemaDefinition };
