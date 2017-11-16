const mongoose = require('mongoose');

const ActivationCodeSchema = mongoose.Schema({
  code: {
    type: Number,
    required: true
  },
  employee_id: {
    type: Number,
    required: true
  },
  token: String,
  created_at: {
    type: Date,
    default: Date.now,
    expires: 600
  }
});

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
