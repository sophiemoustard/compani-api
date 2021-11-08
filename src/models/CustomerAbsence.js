const mongoose = require('mongoose');
const { validateQuery, validateAggregation } = require('./preHooks/validate');

const CUSTOMER_ABSENCE_TYPE = ['hospitalization', 'leave', 'other'];

const CustomerAbsenceSchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  absenceType: { type: String, enum: CUSTOMER_ABSENCE_TYPE, required: true },
}, { timestamps: true });

CustomerAbsenceSchema.pre('find', validateQuery);
CustomerAbsenceSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('CustomerAbsence', CustomerAbsenceSchema);
module.exports.CUSTOMER_ABSENCE_TYPE = CUSTOMER_ABSENCE_TYPE;
