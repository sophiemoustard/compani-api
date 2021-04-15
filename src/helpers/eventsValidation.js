const Boom = require('@hapi/boom');
const moment = require('moment');
const omit = require('lodash/omit');
const momentRange = require('moment-range');
const { INTERVENTION, ABSENCE, UNAVAILABILITY, NEVER } = require('./constants');
const { areObjectIdsEquals } = require('./utils');
const User = require('../models/User');
const Customer = require('../models/Customer');
const ContractsHelper = require('./contracts');
const EventRepository = require('../repositories/EventRepository');
const translate = require('./translate');

const { language } = translate;

momentRange.extendMoment(moment);

exports.isCustomerSubscriptionValid = async (event) => {
  const customer = await Customer.findOne({ _id: event.customer }, { subscriptions: 1 }).lean();

  return customer.subscriptions.some(sub => areObjectIdsEquals(sub._id, event.subscription));
};

exports.isUserContractValidOnEventDates = async (event) => {
  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!user.contracts || user.contracts.length === 0) return false;

  return event.type !== ABSENCE
    ? ContractsHelper.auxiliaryHasActiveContractOnDay(user.contracts, event.startDate)
    : ContractsHelper.auxiliaryHasActiveContractBetweenDates(user.contracts, event.startDate, event.endDate);
};

exports.hasConflicts = async (event) => {
  const { _id, auxiliary, startDate, endDate } = event;

  const auxiliaryEvents = event.type !== ABSENCE
    ? await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, event.company)
    : await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, event.company, ABSENCE);

  return auxiliaryEvents.some((ev) => {
    if ((_id && _id.toHexString() === ev._id.toHexString()) || ev.isCancelled) return false;
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

exports.isDeletionAllowed = event => event.type !== INTERVENTION || !event.isBilled;
