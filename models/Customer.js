const mongoose = require('mongoose');

const {
  MONTHLY,
  ONCE,
  HOURLY,
  FIXED,
} = require('../helpers/constants');
const Event = require('./Event');
const addressSchemaDefinition = require('./schemaDefinitions/address');


const CustomerSchema = mongoose.Schema({
  driveFolder: {
    id: String,
    link: String
  },
  email: { type: String, lowercase: true, trim: true },
  identity: {
    title: String,
    firstname: String,
    lastname: String,
    birthDate: Date
  },
  contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }],
  contact: {
    address: {
      ...addressSchemaDefinition,
      additionalAddress: String,
      location: {
        type: { type: String },
        coordinates: [Number]
      }
    },
    phone: String,
    doorCode: String,
    intercomCode: String
  },
  followUp: {
    pathology: String,
    comments: String,
    details: String,
    misc: String,
    referent: String
  },
  payment: {
    bankAccountOwner: String,
    iban: String,
    bic: String,
    mandates: [{
      rum: String,
      everSignId: String,
      drive: {
        id: String,
        link: String
      },
      signedAt: Date,
      createdAt: { type: Date, default: Date.now },
    }],
  },
  financialCertificates: [{
    driveId: String,
    link: String
  }],
  isActive: Boolean,
  subscriptions: [{
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    versions: [{
      unitTTCRate: Number,
      estimatedWeeklyVolume: Number,
      evenings: Number,
      sundays: Number,
      createdAt: { type: Date, default: Date.now },
    }],
    createdAt: { type: Date, default: Date.now }
  }],
  subscriptionsHistory: [{
    subscriptions: [{
      service: String,
      unitTTCRate: Number,
      estimatedWeeklyVolume: Number,
      evenings: Number,
      sundays: Number,
      startDate: Date,
    }],
    helper: {
      firstname: String,
      lastname: String,
      title: String
    },
    approvalDate: { type: Date, default: Date.now }
  }],
  quotes: [{
    quoteNumber: String,
    subscriptions: [{
      serviceName: String,
      unitTTCRate: Number,
      estimatedWeeklyVolume: Number,
      evenings: Number,
      sundays: Number,
    }],
    drive: {
      id: String,
      link: String
    },
    createdAt: { type: Date, default: Date.now }
  }],
  fundings: [{
    nature: { type: String, enum: [HOURLY, FIXED] },
    subscription: { type: mongoose.Schema.Types.ObjectId },
    thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
    versions: [{
      frequency: { type: String, enum: [MONTHLY, ONCE] },
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
}, { timestamps: true });

const countSubscriptionUsage = async (doc) => {
  if (doc && doc.subscriptions && doc.subscriptions.length > 0) {
    for (const subscription of doc.subscriptions) {
      subscription.eventCount = await Event.countDocuments({ subscription: subscription._id });
    }
  }
};

CustomerSchema.post('findOne', countSubscriptionUsage);

module.exports = mongoose.model('Customer', CustomerSchema);
