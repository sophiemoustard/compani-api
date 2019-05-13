const mongoose = require('mongoose');
const omit = require('lodash/omit');
const flat = require('flat');
const Boom = require('boom');

const {
  MONTHLY,
  ONCE,
  HOURLY,
  FIXED,
} = require('../helpers/constants');
const translate = require('../helpers/translate');

const { language } = translate;

const CustomerSchema = mongoose.Schema({
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
  contracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contract' }],
  sectors: [String],
  contact: {
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
  }],
  fundings: [{
    nature: { type: String, enum: [HOURLY, FIXED] },
    subscription: { type: mongoose.Schema.Types.ObjectId },
    thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
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
    versions: [{
      nature: { type: String, enum: [HOURLY, FIXED] },
      subscription: { type: mongoose.Schema.Types.ObjectId },
      thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId, ref: 'ThirdPartyPayer' },
      frequency: { type: String, enum: [MONTHLY, ONCE] },
      amountTTC: Number,
      unitTTCRate: Number,
      careHours: Number,
      careDays: [Number],
      customerParticipationRate: Number,
      folderNumber: String,
      startDate: Date,
      endDate: Date,
      createdAt: Date,
    }],
  }]
}, { timestamps: true });


async function updateFundingAndSaveHistory(params) {
  try {
    const customer = await this.findOne(
      { _id: params._id },
      { 'identity.firstname': 1, 'identity.lastname': 1, fundings: 1, subscriptions: 1 },
    ).lean();

    if (!customer) throw Boom.notFound(translate[language].customerNotFound);
    const prevFunding = customer.fundings.find(fund => fund._id.toHexString() === params.fundingId);
    const prevVersions = prevFunding.versions ? [...prevFunding.versions] : [];
    prevVersions.push({ ...omit(prevFunding, ['_id', 'versions']) });
    params.payload.versions = prevVersions;

    return this.findOneAndUpdate(
      { _id: params._id, 'fundings._id': params.fundingId },
      { $set: flat({ 'fundings.$': params.payload }, { safe: true }) },
      {
        new: true,
        select: { 'identity.firstname': 1, 'identity.lastname': 1, fundings: 1, subscriptions: 1 },
        autopopulate: false,
      },
    )
      .populate('subscriptions.service')
      .populate('fundings.thirdPartyPayer')
      .lean();
  } catch (e) {
    return Promise.reject(e);
  }
}

CustomerSchema.statics.updateFundingAndSaveHistory = updateFundingAndSaveHistory;

module.exports = mongoose.model('Customer', CustomerSchema);
