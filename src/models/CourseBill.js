const mongoose = require('mongoose');
const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const CourseBillSchema = mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  mainFee: { price: { type: Number, required: true }, count: { type: Number, required: true } },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  courseFundingOrganisation: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseFundingOrganisation' },
}, { timestamps: true });

CourseBillSchema.pre('find', validateQuery);
CourseBillSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => CourseBillSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CourseBill', CourseBillSchema);
