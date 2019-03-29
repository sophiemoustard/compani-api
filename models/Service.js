const mongoose = require('mongoose');

const { CUSTOMER_CONTRACT, COMPANY_CONTRACT, FIXED, HOURLY } = require('../helpers/constants');

const ServiceSchema = mongoose.Schema({
  nature: { type: String, enum: [FIXED, HOURLY] },
  type: { type: String, enum: [CUSTOMER_CONTRACT, COMPANY_CONTRACT] },
  company: mongoose.Schema.Types.ObjectId,
  versions: [{
    name: String,
    defaultUnitAmount: Number,
    vat: Number,
    surcharge: { type: mongoose.Schema.Types.ObjectId, ref: 'Surcharge' },
    startDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  }]
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
