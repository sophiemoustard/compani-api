const mongoose = require('mongoose');
const { validatePayload, validateQuery, validateAggregation } = require('./preHooks/validate');

const DistanceMatrixSchema = mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  origins: { type: String },
  destinations: { type: String },
  mode: { type: String },
  distance: { type: Number },
  duration: { type: Number },
}, {
  timestamps: true,
});

DistanceMatrixSchema.pre('validate', validatePayload);
DistanceMatrixSchema.pre('find', validateQuery);
DistanceMatrixSchema.pre('aggregate', validateAggregation);

module.exports = mongoose.model('DistanceMatrix', DistanceMatrixSchema);
