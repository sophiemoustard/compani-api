const mongoose = require('mongoose');

const TaxCertificateSchema = mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  year: { type: String, required: true, validate: /^[2]{1}[0]{1}[0-9]{2}$/ },
}, { timestamps: true });

module.exports = mongoose.model('TaxCertificate', TaxCertificateSchema);
