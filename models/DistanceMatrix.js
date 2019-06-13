const mongoose = require('mongoose');

const DistanceMatrixSchema = mongoose.Schema({
  origins: { type: String },
  destinations: { type: String },
  mode: { type: String },
  distance: { type: Number },
  duration: { type: Number },
}, {
  timestamps: true
});

module.exports = mongoose.model('DistanceMatrix', DistanceMatrixSchema);
