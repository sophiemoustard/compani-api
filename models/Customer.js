const mongoose = require('mongoose');
const _ = require('lodash');

const SubscriptionsLog = require('./SubscriptionsLog');
const { populateServices } = require('../helpers/populateServices');

const CustomerSchema = mongoose.Schema({
  customerId: String,
  driveFolder: {
    id: String,
    link: String
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  identity: {
    title: String,
    firstname: String,
    lastname: String,
    birthDate: Date
  },
  sectors: [String],
  contact: {
    ogustAddressId: String,
    address: {
      street: String,
      additionalAddress: String,
      zipCode: String,
      city: String,
      fullAddress: String,
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
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  isActive: Boolean,
  subscriptions: [{
    service: { type: mongoose.Schema.Types.ObjectId },
    versions: [{
      unitTTCRate: Number,
      estimatedWeeklyVolume: Number,
      evenings: Number,
      sundays: Number,
      startDate: { type: Date, default: Date.now },
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
      sundays: Number
    }],
    helper: {
      firstname: String,
      lastname: String,
      title: String
    },
    approvalDate: {
      type: Date,
      default: Date.now
    }
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
  }]
}, { timestamps: true });

async function saveSubscriptionsChanges(doc, next) {
  if (this.getUpdate().$pull && this.getUpdate().$pull.subscriptions) {
    const subscriptions = doc.subscriptions.toObject();
    const deletedSub = subscriptions.filter(sub => sub._id.toHexString() === this.getUpdate().$pull.subscriptions._id.toHexString());
    const populatedDeletedSub = await populateServices(deletedSub);
    if (!deletedSub) return next();
    const payload = {
      customer: {
        customerId: doc._id,
        firstname: doc.identity.firstname,
        lastname: doc.identity.lastname,
        ogustId: doc.customerId
      },
      subscriptions: {
        name: populatedDeletedSub[0].service.name,
        unitTTCRate: populatedDeletedSub[0].unitTTCRate,
        estimatedWeeklyVolume: populatedDeletedSub[0].estimatedWeeklyVolume,
        evenings: populatedDeletedSub[0].evenings,
        sundays: populatedDeletedSub[0].sundays
      }
    };
    const cleanPayload = _.pickBy(payload);
    const newLog = new SubscriptionsLog(cleanPayload);
    await newLog.save();
  }
  next();
}

CustomerSchema.post('findOneAndUpdate', saveSubscriptionsChanges);

module.exports = mongoose.model('Customer', CustomerSchema);
