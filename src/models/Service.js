const mongoose = require('mongoose');
const Boom = require('boom');

const { FIXED, HOURLY } = require('../helpers/constants');
const { CONTRACT_STATUS } = require('./Contract');
const Customer = require('./Customer');

const SERVICE_NATURES = [FIXED, HOURLY];

const ServiceSchema = mongoose.Schema({
  nature: { type: String, enum: SERVICE_NATURES },
  type: { type: String, enum: CONTRACT_STATUS },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  versions: [{
    name: String,
    defaultUnitAmount: Number,
    vat: Number,
    surcharge: { type: mongoose.Schema.Types.ObjectId, ref: 'Surcharge' },
    startDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    exemptFromCharges: { type: Boolean, default: false },
  }],
}, { timestamps: true });

function validateQuery(next) {
  const query = this.getQuery();
  if (!query.company) next(Boom.badRequest());
  next();
}

function validatePayload(next) {
  const service = this;
  if (!service.company) next(Boom.badRequest());
  next();
}
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
