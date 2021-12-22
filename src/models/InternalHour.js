const mongoose = require('mongoose');

const { validateQuery, validateAggregation, formatQuery } = require('./preHooks/validate');

const InternalHourSchema = mongoose.Schema({
  name: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

InternalHourSchema.pre('find', validateQuery);
InternalHourSchema.pre('countDocuments', formatQuery);
InternalHourSchema.pre('find', formatQuery);
InternalHourSchema.pre('findOne', formatQuery);
InternalHourSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('InternalHour', InternalHourSchema);
