const mongoose = require('mongoose');

const ActivationCodeSchema = mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  firstSMS: {
    type: Date,
    default: null
  },
  newUserId: {
    type: mongoose.Schema.Types.ObjectId
  },
  userEmail: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 172800 // 2 days expire
  }
});

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
