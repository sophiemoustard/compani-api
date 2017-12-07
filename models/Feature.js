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
// timestamps allows the db to automatically create 'created_at' and 'updated_at' fields

module.exports = mongoose.model('Feature', FeatureSchema);
