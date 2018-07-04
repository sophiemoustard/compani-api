const mongoose = require('mongoose');

const ActivationCodeSchema = mongoose.Schema({
  code: {
    type: String,
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
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  firstSMS: {
    type: Date,
    default: null
  },
  // employee_id: {
  //   type: Number,
  //   required: true
  // },
  // token: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 172800 // 2 days expire
  }
});

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
