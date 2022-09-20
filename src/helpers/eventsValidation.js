const Boom = require('@hapi/boom');
const omit = require('lodash/omit');
const get = require('lodash/get');
const {
  INTERVENTION,
  ABSENCE,
  UNAVAILABILITY,
  NEVER,
  DAILY,
  TIME_STAMPING_ACTIONS,
} = require('./constants');
const User = require('../models/User');
const Customer = require('../models/Customer');
const EventHistory = require('../models/EventHistory');
const ContractsHelper = require('./contracts');
const CustomerAbsencesHelper = require('./customerAbsences');
const EventRepository = require('../repositories/EventRepository');
const UtilsHelper = require('./utils');
const translate = require('./translate');
const { CompaniDate } = require('./dates/companiDates');

const { language } = translate;

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

const isOneDayEvent = event => CompaniDate(event.startDate).isSame(event.endDate, 'day');

const isAuxiliaryUpdated = (payload, eventFromDB) => payload.auxiliary &&
  payload.auxiliary !== eventFromDB.auxiliary.toHexString();

const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

exports.isEditionAllowed = async (event) => {
  if ((event.type !== ABSENCE || event.absenceNature !== DAILY) && !isOneDayEvent(event)) return false;
  if (event.type !== INTERVENTION && !event.auxiliary) return false;

  if (event.auxiliary) {
    const isUserContractValidOnEventDates = await exports.isUserContractValidOnEventDates(event);
    if (!isUserContractValidOnEventDates) return false;
  }

  if (event.type === INTERVENTION) {
    const customerIsAbsent = await CustomerAbsencesHelper.isAbsent(event.customer, event.startDate);
    if (customerIsAbsent) throw Boom.conflict(translate[language].customerIsAbsent);

    return exports.isCustomerSubscriptionValid(event);
  }

  return true;
};

exports.isCreationAllowed = async (event, credentials) => {
  const isConflict = event.auxiliary && !(isRepetition(event) && event.type === INTERVENTION) &&
    await exports.hasConflicts(event);
  if (isConflict) throw Boom.conflict(translate[language].eventsConflict);

  return exports.isEditionAllowed(event, credentials);
};

exports.isUpdateAllowed = async (eventFromDB, payload) => {
  const updateStartDate = payload.startDate && !CompaniDate(eventFromDB.startDate).isSame(payload.startDate);
  const updateEndDate = payload.endDate && !CompaniDate(eventFromDB.endDate).isSame(payload.endDate);
  const updateAuxiliary = payload.auxiliary &&
    !UtilsHelper.areObjectIdsEquals(eventFromDB.auxiliary, payload.auxiliary);
  const cancelEvent = payload.isCancelled;
  const forbiddenUpdateOnTimeStampedEvent = updateAuxiliary || cancelEvent;
  const { startDateTimeStamp, endDateTimeStamp } = eventFromDB;
  if (startDateTimeStamp && (updateStartDate || forbiddenUpdateOnTimeStampedEvent)) return false;
  if (endDateTimeStamp && (updateEndDate || forbiddenUpdateOnTimeStampedEvent)) return false;

  if (eventFromDB.type === INTERVENTION && eventFromDB.isBilled) return false;
  if ([ABSENCE, UNAVAILABILITY].includes(eventFromDB.type) && isAuxiliaryUpdated(payload, eventFromDB)) return false;

  const keysToOmit = payload.auxiliary ? ['repetition'] : ['auxiliary', 'repetition'];
  const frequency = get(payload, 'repetition.frequency') || get(eventFromDB, 'repetition.frequency');
  const event = {
    ...omit(eventFromDB, keysToOmit),
    ...omit(payload, 'repetition.frequency'),
    ...(!!frequency && { repetition: { frequency } }),
  };

  const isSingleEventNotCancelled = !(isRepetition(event) && event.type === INTERVENTION) && !event.isCancelled;
  const undoCancellation = eventFromDB.isCancelled && !payload.isCancelled;
  const hasConflicts = await exports.hasConflicts(event);
  if (event.auxiliary && (isSingleEventNotCancelled || undoCancellation) && hasConflicts) {
    throw Boom.conflict(translate[language].eventsConflict);
  }

  return exports.isEditionAllowed(event);
};

exports.checkDeletionIsAllowed = async (events) => {
  if (events.some(event => event.type === INTERVENTION && event.isBilled)) {
    throw Boom.conflict(translate[language].isBilled);
  }

  const timestampedEventsCount = await EventHistory.countDocuments({
    'event.eventId': { $in: events.map(event => event._id) },
    'event.type': INTERVENTION,
    action: { $in: TIME_STAMPING_ACTIONS },
    isCancelled: false,
  });
  if (timestampedEventsCount) throw Boom.conflict(translate[language].isTimeStamped);
};
