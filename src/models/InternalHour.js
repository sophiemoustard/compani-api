const mongoose = require('mongoose');

const { validateQuery, validateAggregation, formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const InternalHourSchema = mongoose.Schema({
  name: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

InternalHourSchema.pre('find', validateQuery);
InternalHourSchema.pre('aggregate', validateAggregation);
formatQueryMiddlewareList().map(middleware => InternalHourSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('InternalHour', InternalHourSchema);
