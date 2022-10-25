const mongoose = require('mongoose');
const { HOSPITALIZATION, LEAVE, OTHER } = require('../helpers/constants');
const {
  validateQuery,
  validateAggregation,
  validateUpdateOne,
  formatQuery,
  queryMiddlewareList,
} = require('./preHooks/validate');

const CUSTOMER_ABSENCE_TYPE = [HOSPITALIZATION, LEAVE, OTHER];

const CustomerAbsenceSchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, immutable: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  absenceType: { type: String, enum: CUSTOMER_ABSENCE_TYPE, required: true },
}, { timestamps: true });

CustomerAbsenceSchema.pre('find', validateQuery);
CustomerAbsenceSchema.pre('aggregate', validateAggregation);
CustomerAbsenceSchema.pre('updateOne', validateUpdateOne);
queryMiddlewareList.map(middleware => CustomerAbsenceSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CustomerAbsence', CustomerAbsenceSchema);
module.exports.CUSTOMER_ABSENCE_TYPE = CUSTOMER_ABSENCE_TYPE;
