const mongoose = require('mongoose');

const RightSchema = mongoose.Schema({
  description: String,
  permission: {
    type: String,
    unique: true,
  },
  subscription: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Right', RightSchema);
