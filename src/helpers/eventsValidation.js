const Boom = require('@hapi/boom');
const moment = require('moment');
const omit = require('lodash/omit');
const momentRange = require('moment-range');
const { INTERVENTION, ABSENCE, UNAVAILABILITY, NEVER } = require('./constants');
const User = require('../models/User');
const Customer = require('../models/Customer');
const ContractsHelper = require('./contracts');
const EventRepository = require('../repositories/EventRepository');
const UtilsHelper = require('./utils');
const translate = require('./translate');
const DatesHelper = require('./dates');

const { language } = translate;

momentRange.extendMoment(moment);

exports.isCustomerSubscriptionValid = async (event) => {
  const customer = await Customer.countDocuments({
    _id: event.customer,
    'subscriptions._id': event.subscription,
    $or: [{ stoppedAt: { $exists: false } }, { stoppedAt: { $gte: event.startDate } }],
  });

  return !!customer;
};

exports.isUserContractValidOnEventDates = async (event) => {
  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!user.contracts || user.contracts.length === 0) return false;

  return event.type === ABSENCE
    ? ContractsHelper.auxiliaryHasActiveContractBetweenDates(user.contracts, event.startDate, event.endDate)
    : ContractsHelper.auxiliaryHasActiveContractOnDay(user.contracts, event.startDate);
};

exports.hasConflicts = async (event) => {
  const { _id, auxiliary, startDate, endDate } = event;

  const auxiliaryEvents = event.type === ABSENCE
    ? await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, event.company, ABSENCE)
    : await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, event.company);

  return auxiliaryEvents.some((ev) => {
    if ((_id && UtilsHelper.areObjectIdsEquals(_id, ev._id)) || ev.isCancelled) return false;
    return true;
  });
};

const isOneDayEvent = event => moment(event.startDate).isSame(event.endDate, 'day');

const isAuxiliaryUpdated = (payload, eventFromDB) => payload.auxiliary &&
  payload.auxiliary !== eventFromDB.auxiliary.toHexString();

const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

exports.isEditionAllowed = async (event) => {
  if (event.type !== ABSENCE && !isOneDayEvent(event)) return false;
  if (event.type !== INTERVENTION && !event.auxiliary) return false;

  if (event.auxiliary) {
    const isUserContractValidOnEventDates = await exports.isUserContractValidOnEventDates(event);
    if (!isUserContractValidOnEventDates) return false;
  }

  if (event.type === INTERVENTION) return exports.isCustomerSubscriptionValid(event);

  return true;
};

exports.isCreationAllowed = async (event, credentials) => {
  const isConflict = event.auxiliary && !(isRepetition(event) && event.type === INTERVENTION) &&
    await exports.hasConflicts(event);
  if (isConflict) throw Boom.conflict(translate[language].eventsConflict);

  return exports.isEditionAllowed(event, credentials);
};

exports.isUpdateAllowed = async (eventFromDB, payload, credentials) => {
  const updateStartDate = payload.startDate && DatesHelper.diff(eventFromDB.startDate, payload.startDate) !== 0;
  const updateEndDate = payload.endDate && DatesHelper.diff(eventFromDB.endDate, payload.endDate) !== 0;
  const updateAuxiliary = payload.auxiliary &&
    !UtilsHelper.areObjectIdsEquals(eventFromDB.auxiliary, payload.auxiliary);
  const cancelEvent = payload.isCancelled;
  const forbiddenUpdateOnTimeStampedEvent = updateAuxiliary || cancelEvent;
  const { startDateTimeStampedCount, endDateTimeStampedCount } = eventFromDB;
  if (startDateTimeStampedCount && (updateStartDate || forbiddenUpdateOnTimeStampedEvent)) return false;
  if (endDateTimeStampedCount && (updateEndDate || forbiddenUpdateOnTimeStampedEvent)) return false;

  if (eventFromDB.type === INTERVENTION && eventFromDB.isBilled) return false;
  if ([ABSENCE, UNAVAILABILITY].includes(eventFromDB.type) && isAuxiliaryUpdated(payload, eventFromDB)) return false;

  const event = !payload.auxiliary
    ? { ...omit(eventFromDB, 'auxiliary'), ...payload }
    : { ...eventFromDB, ...payload };

  const isSingleIntervention = !(isRepetition(event) && event.type === INTERVENTION) && !event.isCancelled;
  const undoCancellation = eventFromDB.isCancelled && !payload.isCancelled;
  if (event.auxiliary && (isSingleIntervention || undoCancellation) && await exports.hasConflicts(event)) {
    throw Boom.conflict(translate[language].eventsConflict);
  }

  return exports.isEditionAllowed(event, credentials);
};

exports.isDeletionAllowed = event => event.type !== INTERVENTION ||
  (!event.isBilled && !event.startDateTimeStampedCount && !event.endDateTimeStampedCount);
