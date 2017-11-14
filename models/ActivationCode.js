const mongoose = require('mongoose');

const ActivationCodeSchema = mongoose.Schema({
  code: Number,
  created_at: {
    type: Date,
    default: Date.now,
    expires: 600
  }
});

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
