const mongoose = require('mongoose');
const paySchemaDefinition = require('./schemaDefinitions/pay');

const surchargedHoursSchema = {
  hours: Number,
  percentage: Number,
};

const surchargedDetailsSchema = [{
  planName: String,
  saturday: surchargedHoursSchema,
  sunday: surchargedHoursSchema,
  publicHoliday: surchargedHoursSchema,
  twentyFifthOfDecember: surchargedHoursSchema,
  firstOfMay: surchargedHoursSchema,
  evening: surchargedHoursSchema,
  custom: surchargedHoursSchema,
}];

const PaySchema = mongoose.Schema({
  ...paySchemaDefinition,
  surchargedAndNotExemptDetails: surchargedDetailsSchema,
  surchargedAndExemptDetails: surchargedDetailsSchema,
}, { timestamps: true });

module.exports = mongoose.model('Pay', PaySchema);
