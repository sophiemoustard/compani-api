const mongoose = require('mongoose');

const ActivationCodeSchema = mongoose.Schema({
  code: { type: String, required: true },
  firstSMS: { type: Date, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now, expires: 172800 }, // 2 days expire
});

module.exports = mongoose.model('ActivationCode', ActivationCodeSchema);
