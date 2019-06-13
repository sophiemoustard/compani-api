const mongoose = require('mongoose');

const { CUSTOMER_CONTRACT, COMPANY_CONTRACT, FIXED, HOURLY } = require('../helpers/constants');
const Customer = require('./Customer');

const ServiceSchema = mongoose.Schema({
  nature: { type: String, enum: [FIXED, HOURLY] },
  type: { type: String, enum: [CUSTOMER_CONTRACT, COMPANY_CONTRACT] },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  versions: [{
    name: String,
    defaultUnitAmount: Number,
    vat: Number,
    surcharge: { type: mongoose.Schema.Types.ObjectId, ref: 'Surcharge' },
    startDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    exemptFromCharges: { type: Boolean, default: false },
  }]
}, { timestamps: true });

const countServiceUsage = async (docs) => {
  if (docs.length > 0) {
    for (const service of docs) {
      service.subscriptionCount = await Customer.countDocuments({ 'subscriptions.service': service._id });
    }
  }
};

ServiceSchema.post('find', countServiceUsage);

module.exports = mongoose.model('Service', ServiceSchema);
