const mongoose = require('mongoose');

const CustomerSchema = mongoose.Schema({
  customerId: String,
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
      evenSignId: String,
      drivId: String,
      signedAt: Date,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  isActive: Boolean,
  subscriptions: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
    },
    unitTTCRate: Number,
    estimatedWeeklyVolume: Number,
    evenings: Boolean,
    sundays: Boolean,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
