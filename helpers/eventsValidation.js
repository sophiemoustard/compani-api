const moment = require('moment');
const _ = require('lodash');
const momentRange = require('moment-range');
const {
  INTERVENTION,
  ABSENCE,
  UNAVAILABILITY,
  NEVER,
} = require('./constants');
const User = require('../models/User');
const EventsHelper = require('./events');
const EventRepository = require('../repositories/EventRepository');

momentRange.extendMoment(moment);

exports.hasConflicts = async (event) => {
  const { _id, auxiliary, startDate, endDate } = event;
  const auxiliaryEvents = event.type !== ABSENCE
    ? await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate)
    : await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate, ABSENCE);

  return auxiliaryEvents.some((ev) => {
    if ((_id && _id.toHexString() === ev._id.toHexString()) || ev.isCancelled) return false;
    return true;
  });
};

const isOneDayEvent = event => moment(event.startDate).isSame(event.endDate, 'day');
const eventHasAuxiliarySector = (event, user) => event.sector === user.sector.toHexString();
const isAuxiliaryUpdated = (payload, eventFromDB) => payload.auxiliary && payload.auxiliary !== eventFromDB.auxiliary.toHexString();
const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

exports.isCreationAllowed = async (event) => {
  if (event.type !== ABSENCE && !isOneDayEvent(event)) return false;
  if (!event.auxiliary) return event.type === INTERVENTION;

  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!await EventsHelper.checkContracts(event, user)) return false;

  if (!(isRepetition(event) && event.type === INTERVENTION) && await exports.hasConflicts(event)) return false;

  if (!eventHasAuxiliarySector(event, user)) return false;

  return true;
};

exports.isEditionAllowed = async (eventFromDB, payload) => {
  if (eventFromDB.type === INTERVENTION && eventFromDB.isBilled) return false;

  if ([ABSENCE, UNAVAILABILITY].includes(eventFromDB.type) && isAuxiliaryUpdated(payload, eventFromDB)) return false;

  const event = !payload.auxiliary
    ? { ..._.omit(eventFromDB, 'auxiliary'), ...payload }
    : { ...eventFromDB, ...payload };

  if (event.type !== ABSENCE && !isOneDayEvent(event)) return false;
  if (!event.auxiliary) return event.type === INTERVENTION;

  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!await EventsHelper.checkContracts(event, user)) return false;

  if (!event.isCancelled && (await exports.hasConflicts(event))) return false;

  if (!eventHasAuxiliarySector(event, user)) return false;

  return true;
};
