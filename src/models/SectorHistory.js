const mongoose = require('mongoose');
const { validateQuery, validatePayload, validateAggregation } = require('./preHooks/validate');

const SectorHistorySchema = mongoose.Schema({
  sector: { type: mongoose.Schema.Types.ObjectId, required: true },
  auxiliary: { type: mongoose.Schema.Types.ObjectId, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
  endDate: Date,
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
  id: false,
});

SectorHistorySchema.pre('aggregate', validateAggregation);
SectorHistorySchema.pre('find', validateQuery);
SectorHistorySchema.pre('validate', validatePayload);

module.exports = mongoose.model('SectorHistory', SectorHistorySchema);
