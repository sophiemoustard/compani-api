const Boom = require('@hapi/boom');
const {
  INTERVENTION,
  ABSENCE,
  NEVER,
  TIME_STAMPING_ACTIONS,
} = require('./constants');
const User = require('../models/User');
const Customer = require('../models/Customer');
const EventHistory = require('../models/EventHistory');
const ContractsHelper = require('./contracts');
const EventRepository = require('../repositories/EventRepository');
const UtilsHelper = require('./utils');
const translate = require('./translate');

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

  if (event.type === ABSENCE) {
    return ContractsHelper.auxiliaryHasActiveContractBetweenDates(user.contracts, event.startDate, event.endDate);
  }

  if (isRepetition(event)) {
    return ContractsHelper.auxiliaryHasActiveContractBetweenDates(user.contracts, event.startDate);
  }

  return ContractsHelper.auxiliaryHasActiveContractOnDay(user.contracts, event.startDate);
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

const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

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
