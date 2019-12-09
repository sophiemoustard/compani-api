const mongoose = require('mongoose');

const { validateQuery, validatePayload } = require('./preHooks/validate');

const InternalHourSchema = mongoose.Schema({
  name: { type: String, required: true },
  default: { type: Boolean, default: false },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

InternalHourSchema.pre('find', validateQuery);
InternalHourSchema.pre('validate', validatePayload);

module.exports = mongoose.model('InternalHour', InternalHourSchema);
