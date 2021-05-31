const mongoose = require('mongoose');
const mongooseLeanVirtuals = require('mongoose-lean-virtuals');
const {
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION,
  DAILY,
  HOURLY,
  AUXILIARY_INITIATIVE,
  CUSTOMER_INITIATIVE,
  INVOICED_AND_PAID,
  INVOICED_AND_NOT_PAID,
  PAID_LEAVE,
  UNPAID_LEAVE,
  MATERNITY_LEAVE,
  PATERNITY_LEAVE,
  PARENTAL_LEAVE,
  ILLNESS,
  OTHER,
  UNJUSTIFIED,
  WORK_ACCIDENT,
  TRANSPORT_ACCIDENT,
  CESSATION_OF_WORK_CHILD,
  CESSATION_OF_WORK_RISK,
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
  EVERY_TWO_WEEKS,
  NOT_INVOICED_AND_NOT_PAID,
} = require('../helpers/constants');
const driveResourceSchemaDefinition = require('./schemaDefinitions/driveResource');
const addressSchemaDefinition = require('./schemaDefinitions/address');
const billEventSurchargesSchemaDefinition = require('./schemaDefinitions/billEventSurcharges');

const EVENT_TYPES = [ABSENCE, INTERNAL_HOUR, INTERVENTION, UNAVAILABILITY];
const ABSENCE_NATURES = [HOURLY, DAILY];
const ABSENCE_TYPES = [
  PAID_LEAVE,
  UNPAID_LEAVE,
  MATERNITY_LEAVE,
  PATERNITY_LEAVE,
  PARENTAL_LEAVE,
  ILLNESS,
  UNJUSTIFIED,
  OTHER,
  WORK_ACCIDENT,
  TRANSPORT_ACCIDENT,
  CESSATION_OF_WORK_CHILD,
  CESSATION_OF_WORK_RISK,
];
const EVENT_CANCELLATION_REASONS = [AUXILIARY_INITIATIVE, CUSTOMER_INITIATIVE];
const EVENT_CANCELLATION_CONDITIONS = [INVOICED_AND_PAID, INVOICED_AND_NOT_PAID, NOT_INVOICED_AND_NOT_PAID];
const REPETITION_FREQUENCIES = [NEVER, EVERY_DAY, EVERY_WEEK_DAY, EVERY_WEEK, EVERY_TWO_WEEKS];

const { validateQuery, validateAggregation } = require('./preHooks/validate');
const { TIMESTAMPING_ACTIONS } = require('./EventHistory');

const EventSchema = mongoose.Schema(
  {
    type: { type: String, enum: EVENT_TYPES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required() { return !this.sector; } },
    sector: { type: mongoose.Schema.Types.ObjectId, ref: 'Sector', required() { return !this.auxiliary; } },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required() { return this.type === INTERVENTION; },
    },
    subscription: { type: mongoose.Schema.Types.ObjectId, required() { return this.type === INTERVENTION; } },
    internalHour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InternalHour',
      required() { return this.type === INTERNAL_HOUR; },
    },
    absence: { type: String, enum: ABSENCE_TYPES, required() { return this.type === ABSENCE; } },
    absenceNature: { type: String, enum: ABSENCE_NATURES, required() { return this.type === ABSENCE; } },
    extension: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    address: {
      type: mongoose.Schema(addressSchemaDefinition, { _id: false, id: false }),
      required() { return this.type === INTERVENTION; },
    },
    misc: {
      type: String,
      required() { return (this.type === ABSENCE && this.absence === OTHER) || this.isCancelled; },
    },
    attachment: {
      type: mongoose.Schema(driveResourceSchemaDefinition, { _id: false, id: false }),
      required() { return [ILLNESS, WORK_ACCIDENT].includes(this.absence); },
    },
    repetition: {
      frequency: { type: String, enum: REPETITION_FREQUENCIES },
      parentId: { type: mongoose.Schema.Types.ObjectId },
    },
    isCancelled: { type: Boolean, default: false },
    cancel: {
      condition: { type: String, enum: EVENT_CANCELLATION_CONDITIONS, required() { return this.isCancelled; } },
      reason: { type: String, enum: EVENT_CANCELLATION_REASONS, required() { return this.isCancelled; } },
    },
    isBilled: { type: Boolean, default: false },
    bills: {
      inclTaxesCustomer: Number,
      exclTaxesCustomer: Number,
      thirdPartyPayer: { type: mongoose.Schema.Types.ObjectId },
      inclTaxesTpp: Number,
      exclTaxesTpp: Number,
      fundingId: { type: mongoose.Schema.Types.ObjectId },
      nature: String,
      careHours: Number,
      surcharges: billEventSurchargesSchemaDefinition,
    },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  },
  { timestamps: true }
);

EventSchema.virtual('histories', { ref: 'EventHistory', localField: '_id', foreignField: 'event.eventId' });

EventSchema.virtual(
  'startDateTimeStampedCount',
  {
    ref: 'EventHistory',
    localField: '_id',
    foreignField: 'event.eventId',
    options: {
      match: {
        action: { $in: TIMESTAMPING_ACTIONS },
        'update.startHour': { $exists: true },
      },
    },
    count: true,
  }
);

EventSchema.pre('find', validateQuery);
EventSchema.pre('aggregate', validateAggregation);

EventSchema.plugin(mongooseLeanVirtuals);

module.exports = mongoose.model('Event', EventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.ABSENCE_NATURES = ABSENCE_NATURES;
module.exports.EVENT_CANCELLATION_CONDITIONS = EVENT_CANCELLATION_CONDITIONS;
module.exports.EVENT_CANCELLATION_REASONS = EVENT_CANCELLATION_REASONS;
module.exports.ABSENCE_TYPES = ABSENCE_TYPES;
module.exports.REPETITION_FREQUENCIES = REPETITION_FREQUENCIES;
