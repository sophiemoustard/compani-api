const mongoose = require('mongoose');

const IdentityVerificationSchema = mongoose.Schema({
  createdAt: { type: Date, timestamp: true, default: Date.now, required: true },
  email: { type: String, required: true },
  code: { type: Number, required: true },
});

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);
