const mongoose = require('mongoose');

const { validateQuery, validatePayload } = require('./preHooks/validate');
const { FIXED, HOURLY } = require('../helpers/constants');
const { CONTRACT_STATUS } = require('./Contract');
const Customer = require('./Customer');

const SERVICE_NATURES = [FIXED, HOURLY];

const ServiceSchema = mongoose.Schema({
  nature: { type: String, enum: SERVICE_NATURES, required: true },
  type: { type: String, enum: CONTRACT_STATUS, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  versions: [{
    name: { type: String, required: true },
    defaultUnitAmount: { type: Number, required: true },
    vat: { type: Number, default: 0 },
    surcharge: { type: mongoose.Schema.Types.ObjectId, ref: 'Surcharge' },
    startDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    exemptFromCharges: { type: Boolean, required: true },
  }],
}, { timestamps: true });

const countServiceUsage = async (docs) => {
  if (docs.length > 0) {
    for (const service of docs) {
      service.subscriptionCount = await Customer.countDocuments({ 'subscriptions.service': service._id });
    }
  }
};

ServiceSchema.pre('find', validateQuery);
ServiceSchema.pre('validate', validatePayload);
ServiceSchema.post('find', countServiceUsage);

module.exports = mongoose.model('Service', ServiceSchema);
module.exports.SERVICE_NATURES = SERVICE_NATURES;
