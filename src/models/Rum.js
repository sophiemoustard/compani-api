const mongoose = require('mongoose');
const { validateQuery, validateAggregation, validateUpdateOne, formatQuery } = require('./preHooks/validate');

const RumSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

RumSchema.pre('find', validateQuery);
RumSchema.pre('countDocuments', formatQuery);
RumSchema.pre('find', formatQuery);
RumSchema.pre('findOne', formatQuery);
RumSchema.pre('aggregate', validateAggregation);
RumSchema.pre('updateOne', validateUpdateOne);

module.exports = mongoose.model('Rum', RumSchema);
