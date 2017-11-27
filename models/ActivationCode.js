const mongoose = require('mongoose');

const ActivationCodeSchema = mongoose.Schema({
  code: {
    type: Number,
    required: true
  },
  mobile_phone: {
    type: String,
    required: true
  },
  sector: {
    type: String,
    required: true
  },
  // employee_id: {
  //   type: Number,
  //   required: true
  // },
  // token: String,
  created_at: {
    type: Date,
    default: Date.now,
    expires: 172800 // 2 days expire
  }
});

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
