const mongoose = require('mongoose');
const {
  validateQuery,
  validateAggregation,
  validateUpdateOne,
  formatQuery,
  queryMiddlewareList,
} = require('./preHooks/validate');

const RumSchema = mongoose.Schema({
  prefix: { type: String, required: true },
  seq: { type: Number, default: 1 },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });

RumSchema.pre('find', validateQuery);
RumSchema.pre('aggregate', validateAggregation);
RumSchema.pre('updateOne', validateUpdateOne);
queryMiddlewareList.map(middleware => RumSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('Rum', RumSchema);
