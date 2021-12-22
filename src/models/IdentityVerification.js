const mongoose = require('mongoose');
const { formatQuery } = require('./preHooks/validate');

const IdentityVerificationSchema = mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
}, { timestamps: true });

IdentityVerificationSchema.pre('countDocuments', formatQuery);
IdentityVerificationSchema.pre('find', formatQuery);
IdentityVerificationSchema.pre('findOne', formatQuery);

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);
