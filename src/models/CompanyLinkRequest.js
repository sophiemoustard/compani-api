const mongoose = require('mongoose');
const { formatQuery, queryMiddlewareList } = require('./preHooks/validate');

const CompanyLinkRequestSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, unique: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
}, { timestamps: true });

queryMiddlewareList.map(middleware => CompanyLinkRequestSchema.pre(middleware, formatQuery));

module.exports = mongoose.model('CompanyLinkRequest', CompanyLinkRequestSchema);
