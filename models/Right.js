const mongoose = require('mongoose');

const RightSchema = mongoose.Schema({
  description: String,
  permission: {
    type: String,
    unique: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Right', RightSchema);
