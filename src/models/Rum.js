const mongoose = require('mongoose');
const {
  validatePayload,
  validateQuery,
  validateAggregation,
  validateUpdateOne,
} = require('./preHooks/validate');

const RumSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

RumSchema.pre('validate', validatePayload);
RumSchema.pre('find', validateQuery);
RumSchema.pre('aggregate', validateAggregation);
RumSchema.pre('updateOne', validateUpdateOne);

module.exports = mongoose.model('Rum', RumSchema);
