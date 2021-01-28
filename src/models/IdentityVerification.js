const mongoose = require('mongoose');

const IdentityVerificationSchema = mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);
