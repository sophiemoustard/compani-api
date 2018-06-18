const mongoose = require('mongoose');

// Feature schema
const FeatureSchema = mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    dropDups: true
  },
}, { timestamps: true });

module.exports = mongoose.model('Feature', FeatureSchema);
