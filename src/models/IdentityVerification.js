const mongoose = require('mongoose');

const IdentityVerificationSchema = mongoose.Schema({
  email: { type: String, required: true },
  code: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);
