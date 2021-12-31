const mongoose = require('mongoose');
const { formatQuery, formatQueryMiddlewareList } = require('./preHooks/validate');

const IdentityVerificationSchema = mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
}, { timestamps: true });

formatQueryMiddlewareList().map(middleware => IdentityVerificationSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);
