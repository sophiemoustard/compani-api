const mongoose = require('mongoose');
const {
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION,
  DAILY,
  HOURLY,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
} = require('../helpers/constants');

const EventSchema = mongoose.Schema({
  type: {
    type: String,
    enum: [ABSENCE, INTERNAL_HOUR, INTERVENTION, UNAVAILABILITY]
  },
  startDate: Date,
  endDate: Date,
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sector: mongoose.Schema.Types.ObjectId,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  subscription: { type: mongoose.Schema.Types.ObjectId },
  internalHour: {
    name: String,
    _id: { type: mongoose.Schema.Types.ObjectId },
  },
  absence: String,
  absenceNature: { type: String, enum: [HOURLY, DAILY] },
  location: {
    street: String,
    fullAddress: String,
    zipCode: String,
    city: String
  },
  misc: String,
  attachment: {
    link: String,
    driveId: String,
  },
  repetition: {
    frequency: String,
    parentId: { type: mongoose.Schema.Types.ObjectId },
  },
  isCancelled: { type: Boolean, default: false },
  cancel: {
    condition: String,
    reason: String,
  },
  isBilled: { type: Boolean, default: false },
  bills: {
    inclTaxesCustomer: Number,
    exclTaxesCustomer: Number,
    thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId },
    inclTaxesTpp: Number,
    exclTaxesTpp: Number,
    fundingVersion: { type: mongoose.Schema.Types.ObjectId },
    nature: String,
    careHours: Number,
  },
  status: { type: String, enum: [COMPANY_CONTRACT, CUSTOMER_CONTRACT] }
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
