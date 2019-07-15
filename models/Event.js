const mongoose = require('mongoose');
const {
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION,
  DAILY,
  HOURLY,
} = require('../helpers/constants');
const driveFileSchemaDefinition = require('./schemaDefinitions/driveFile');
const { CONTRACT_STATUS } = require('./Contract');

const EVENT_TYPES = [ABSENCE, INTERNAL_HOUR, INTERVENTION, UNAVAILABILITY];
const ABSENCE_NATURES = [HOURLY, DAILY];

const EventSchema = mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES },
  startDate: Date,
  endDate: Date,
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sector: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  subscription: { type: mongoose.Schema.Types.ObjectId },
  internalHour: {
    name: String,
    _id: { type: mongoose.Schema.Types.ObjectId },
  },
  absence: String,
  absenceNature: { type: String, enum: ABSENCE_NATURES },
  location: {
    street: String,
    fullAddress: String,
    zipCode: String,
    city: String,
  },
  misc: String,
  attachment: driveFileSchemaDefinition,
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
  status: { type: String, enum: CONTRACT_STATUS },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.ABSENCE_NATURES = ABSENCE_NATURES;
