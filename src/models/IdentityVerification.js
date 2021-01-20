const mongoose = require('mongoose');

// User schema
const IdentityVerificationSchema = mongoose.Schema({
  creationDate: { type: Date },
  email: { type: String },
  verificationCode: { type: Number },
});

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);
