const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const IdentityVerificationSchema = mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => IdentityVerificationSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('IdentityVerification', IdentityVerificationSchema);
