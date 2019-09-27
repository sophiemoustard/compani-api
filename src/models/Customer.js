const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const Boom = require('boom');

const {
  MONTHLY,
  ONCE,
  HOURLY,
  FIXED,
} = require('../helpers/constants');
const Event = require('./Event');
const User = require('./User');
const Drive = require('./Google/Drive');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const locationSchemaDefinition = require('./schemaDefinitions/location');
const identitySchemaDefinition = require('./schemaDefinitions/identity');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const subscriptionSchemaDefinition = require('./schemaDefinitions/subscription');

const FUNDING_FREQUENCIES = [MONTHLY, ONCE];
const FUNDING_NATURES = [FIXED, HOURLY];

const CustomerSchema = mongoose.Schema({
  driveFolder: driveResourceSchemaDefinition,
  email: { type: String, lowercase: true, trim: true },
  identity: {
    type: mongoose.Schema(identitySchemaDefinition, { _id: false }),
    required: true,
  },
  contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }],
  contact: {
    address: {
      ...addressSchemaDefinition,
      additionalAddress: String,
      location: locationSchemaDefinition,
    },
    phone: String,
    accessCodes: String,
  },
  followUp: {
    environment: String,
    objectives: String,
    misc: String,
  },
  payment: {
    bankAccountOwner: String,
    iban: String,
    bic: String,
    mandates: [{
      rum: String,
      everSignId: String,
      drive: driveResourceSchemaDefinition,
      signedAt: Date,
      createdAt: { type: Date, default: Date.now },
    }],
  },
  financialCertificates: [driveResourceSchemaDefinition],
  subscriptions: [{
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    versions: [{
      ...subscriptionSchemaDefinition,
      createdAt: { type: Date, default: Date.now },
    }],
    createdAt: { type: Date, default: Date.now },
  }],
  subscriptionsHistory: [{
    subscriptions: [{
      ...subscriptionSchemaDefinition,
      service: String,
      startDate: Date,
    }],
    helper: {
      firstname: String,
      lastname: String,
      title: String,
    },
    approvalDate: { type: Date, default: Date.now },
  }],
  quotes: [{
    quoteNumber: String,
    subscriptions: [{
      ...subscriptionSchemaDefinition,
      serviceName: String,
    }],
    drive: driveResourceSchemaDefinition,
    createdAt: { type: Date, default: Date.now },
  }],
  fundings: [{
    nature: { type: String, enum: FUNDING_NATURES },
    subscription: { type: mongoose.Schema.Types.ObjectId },
    thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
    versions: [{
      frequency: { type: String, enum: FUNDING_FREQUENCIES },
      amountTTC: Number,
      unitTTCRate: Number,
      careHours: Number,
      careDays: [Number],
      customerParticipationRate: Number,
      folderNumber: String,
      startDate: Date,
      endDate: Date,
      createdAt: { type: Date, default: Date.now },
    }],
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

const countSubscriptionUsage = async (doc) => {
  if (doc && doc.subscriptions && doc.subscriptions.length > 0) {
    for (const subscription of doc.subscriptions) {
      subscription.eventCount = await Event.countDocuments({ subscription: subscription._id });
    }
  }
};

async function removeCustomer(next) {
  const customer = this;
  const { _id, driveFolder } = customer;

  try {
    if (!_id) throw Boom.badRequest('CustomerId is missing.');
    if (!driveFolder.driveId) throw Boom.badRequest('CustomerDriveId is missing.');

    await Promise.all([User.deleteMany({ customers: _id }), Drive.deleteFile({ fileId: driveFolder.driveId })]);
    return next();
  } catch (e) {
    return next(e);
  }
}

CustomerSchema.virtual('firstIntervention', {
  ref: 'Event',
  localField: '_id',
  foreignField: 'customer',
  justOne: true,
  options: { sort: { startDate: 1 } },
});

CustomerSchema.pre('remove', removeCustomer);
CustomerSchema.post('findOne', countSubscriptionUsage);

CustomerSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Customer', CustomerSchema);
module.exports.FUNDING_FREQUENCIES = FUNDING_FREQUENCIES;
module.exports.FUNDING_NATURES = FUNDING_NATURES;
