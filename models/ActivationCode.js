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
    // required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true
  },
  firstSMS: {
    type: Date,
    default: null
  },
  newUserId: {
    type: mongoose.Schema.Types.ObjectId
  },
  // employee_id: {
  //   type: Number,
  //   required: true
  // },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 172800 // 2 days expire
  }
});

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
