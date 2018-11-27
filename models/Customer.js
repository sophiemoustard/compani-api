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
    rib: String,
    bic: String
  },
  isActive: Boolean,
  helpers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
