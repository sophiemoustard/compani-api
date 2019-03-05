const mongoose = require('mongoose');

const ServiceSchema = mongoose.Schema({
  nature: String,
  versions: [{
    defaultUnitAmount: Number,
    vat: Number,
    holidaySurcharge: Number,
    eveningSurcharge: Number,
    startDate: { type: Date, default: Date.now },
    name: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
