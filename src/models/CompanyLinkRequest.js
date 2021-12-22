const mongoose = require('mongoose');
const { formatQuery } = require('./preHooks/validate');

const CompanyLinkRequestSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, unique: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
}, { timestamps: true });

CompanyLinkRequestSchema.pre('countDocuments', formatQuery);
CompanyLinkRequestSchema.pre('find', formatQuery);
CompanyLinkRequestSchema.pre('findOne', formatQuery);

module.exports = mongoose.model('CompanyLinkRequest', CompanyLinkRequestSchema);
