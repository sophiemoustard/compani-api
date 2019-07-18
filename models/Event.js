const mongoose = require('mongoose');
const {
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION,
  DAILY,
  HOURLY,
  AUXILIARY_INITIATIVE,
  CUSTOMER_INITIATIVE,
  INVOICED_AND_PAYED,
  INVOICED_AND_NOT_PAYED,
  PAID_LEAVE,
  UNPAID_LEAVE,
  MATERNITY_LEAVE,
  ILLNESS,
  UNJUSTIFIED,
  WEDDING,
  BIRTH,
  DEATH,
  WORK_ACCIDENT,
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
} = require('../helpers/constants');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const { CONTRACT_STATUS } = require('./Contract');

const EVENT_TYPES = [ABSENCE, INTERNAL_HOUR, INTERVENTION, UNAVAILABILITY];
const ABSENCE_NATURES = [HOURLY, DAILY];
const ABSENCE_TYPES = [
  PAID_LEAVE,
  UNPAID_LEAVE,
  MATERNITY_LEAVE,
  ILLNESS,
  UNJUSTIFIED,
  WEDDING,
  BIRTH,
  DEATH,
  WORK_ACCIDENT,
];
const EVENT_CANCELLATION_CONDITIONS = [AUXILIARY_INITIATIVE, CUSTOMER_INITIATIVE];
const EVENT_CANCELLATION_REASONS = [INVOICED_AND_PAYED, INVOICED_AND_NOT_PAYED];
const REPETITION_FREQUENCIES = [NEVER, EVERY_DAY, EVERY_WEEK_DAY, EVERY_WEEK];

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
  absence: { type: String, enum: ABSENCE_TYPES },
  absenceNature: { type: String, enum: ABSENCE_NATURES },
  location: {
    street: String,
    fullAddress: String,
    zipCode: String,
    city: String,
  },
  misc: String,
  attachment: driveResourceSchemaDefinition,
  repetition: {
    frequency: { type: String, enum: REPETITION_FREQUENCIES },
    parentId: { type: mongoose.Schema.Types.ObjectId },
  },
  isCancelled: { type: Boolean, default: false },
  cancel: {
    condition: { type: String, enum: EVENT_CANCELLATION_CONDITIONS },
    reason: { type: String, enum: EVENT_CANCELLATION_REASONS },
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
module.exports.EVENT_CANCELLATION_CONDITIONS = EVENT_CANCELLATION_CONDITIONS;
module.exports.EVENT_CANCELLATION_REASONS = EVENT_CANCELLATION_REASONS;
module.exports.ABSENCE_TYPES = ABSENCE_TYPES;
module.exports.REPETITION_FREQUENCIES = REPETITION_FREQUENCIES;
