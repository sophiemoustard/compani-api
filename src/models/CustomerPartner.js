const mongoose = require('mongoose');

const CustomerPartnerSchema = mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true });

module.exports = mongoose.model('CustomerPartner', CustomerPartnerSchema);
