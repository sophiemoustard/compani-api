const mongoose = require('mongoose');

const { validateQuery, validateAggregation } = require('./preHooks/validate');

const InternalHourSchema = mongoose.Schema({
  name: { type: String, required: true },
  default: { type: Boolean, default: false },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

InternalHourSchema.pre('find', validateQuery);
InternalHourSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('InternalHour', InternalHourSchema);
