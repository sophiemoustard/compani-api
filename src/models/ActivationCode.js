const mongoose = require('mongoose');
const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const ActivationCodeSchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  code: { type: String, required: true },
  firstSMS: { type: Date, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now, expires: 172800 }, // 2 days expire
});

ActivationCodeSchema.pre('aggregate', validateAggregation);
ActivationCodeSchema.pre('find', validateQuery);
ActivationCodeSchema.pre('validate', validatePayload);

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
