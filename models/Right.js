const mongoose = require('mongoose');

// Feature schema
const RightSchema = mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    dropDups: true
  },
  description: String,
  permission: String
}, { timestamps: true });

module.exports = mongoose.model('Right', RightSchema);
