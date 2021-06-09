const mongoose = require('mongoose');

const UserCompanySchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, immutable: true },
}, { timestamps: true });

module.exports = mongoose.model('UserCompany', UserCompanySchema);
