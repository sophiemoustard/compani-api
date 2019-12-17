const moment = require('moment');
const get = require('lodash/get');
const omit = require('lodash/omit');
const cloneDeep = require('lodash/cloneDeep');
const pick = require('lodash/pick');
const momentRange = require('moment-range');
const {
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
  EVERY_TWO_WEEKS,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION,
  INTERNAL_HOUR,
} = require('./constants');
const Event = require('../models/Event');
const Repetition = require('../models/Repetition');
const EventHistoriesHelper = require('./eventHistories');
const RepetitionsHelper = require('./repetitions');
const EventsValidationHelper = require('./eventsValidation');

momentRange.extendMoment(moment);

exports.formatRepeatedPayload = async (event, momentDay) => {
  const step = momentDay.diff(event.startDate, 'd');
  const payload = {
    ...cloneDeep(omit(event, '_id')), // cloneDeep necessary to copy repetition
    startDate: moment(event.startDate).add(step, 'd'),
    endDate: moment(event.endDate).add(step, 'd'),
  };

  if (event.type === INTERVENTION && event.auxiliary && await EventsValidationHelper.hasConflicts(cloneDeep(payload))) {
    delete payload.auxiliary;
    payload.repetition.frequency = NEVER;
  } else if ((event.type === INTERNAL_HOUR || event.type === UNAVAILABILITY) && await EventsValidationHelper.isAbsent({ ...payload, _id: event._id })) {
    return null;
  }
  return new Event(payload);
};

exports.createRepetitionsEveryDay = async (payload) => {
  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(90, 'd');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const repeatedEvent = await exports.formatRepeatedPayload(payload, range[i]);
    if (repeatedEvent) repeatedEvents.push(repeatedEvent);
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsEveryWeekDay = async (payload) => {
  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(90, 'd');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const day = moment(range[i]).day();
    if (day !== 0 && day !== 6) {
      const repeatedEvent = await exports.formatRepeatedPayload(payload, range[i]);
      if (repeatedEvent) repeatedEvents.push(repeatedEvent);
    }
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsByWeek = async (payload, step) => {
  const start = moment(payload.startDate).add(step, 'w');
  const end = moment(payload.startDate).add(90, 'd');
  const range = Array.from(moment().range(start, end).by('weeks', { step }));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const repeatedEvent = await exports.formatRepeatedPayload(payload, range[i]);
    if (repeatedEvent) repeatedEvents.push(repeatedEvent);
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitions = async (eventFromDb, payload) => {
  if (payload.repetition.frequency === NEVER) return eventFromDb;

  if (get(eventFromDb, 'repetition.frequency', NEVER) !== NEVER) {
    await Event.findOneAndUpdate({ _id: eventFromDb._id }, { 'repetition.parentId': eventFromDb._id });
  }
  payload.repetition.parentId = eventFromDb._id;
  switch (payload.repetition.frequency) {
    case EVERY_DAY:
      await exports.createRepetitionsEveryDay(payload);
      break;
    case EVERY_WEEK_DAY:
      await exports.createRepetitionsEveryWeekDay(payload);
      break;
    case EVERY_WEEK:
      await exports.createRepetitionsByWeek(payload, 1);
      break;
    case EVERY_TWO_WEEKS:
      await exports.createRepetitionsByWeek(payload, 2);
      break;
    default:
      break;
  }

  await (new Repetition({ ...payload, ...payload.repetition })).save();

  return eventFromDb;
};

exports.updateRepetition = async (event, eventPayload, credentials) => {
  const parentStartDate = moment(eventPayload.startDate);
  const parentEndDate = moment(eventPayload.endDate);
  const promises = [];
  const companyId = get(credentials, 'company._id', null);

  const events = await Event.find({
    'repetition.parentId': event.repetition.parentId,
    'repetition.frequency': { $not: { $eq: NEVER } },
    startDate: { $gte: new Date(event.startDate) },
    company: companyId,
  });

  for (let i = 0, l = events.length; i < l; i++) {
    const startDate = moment(events[i].startDate).hours(parentStartDate.hours()).minutes(parentStartDate.minutes()).toISOString();
    const endDate = moment(events[i].endDate).hours(parentEndDate.hours()).minutes(parentEndDate.minutes()).toISOString();
    let eventToSet = {
      ...eventPayload,
      startDate,
      endDate,
      _id: events[i]._id,
    };

    let unset;
    if (eventPayload.auxiliary && event.type === INTERVENTION && await EventsValidationHelper.hasConflicts({ ...eventToSet, company: companyId })) {
      eventToSet = omit(eventToSet, ['repetition', 'auxiliary']);
      unset = { auxiliary: '', repetition: '' };
    } else if (!eventPayload.auxiliary) {
      eventToSet = omit(eventToSet, 'auxiliary');
      unset = { auxiliary: '' };
    }

    promises.push(Event.findOneAndUpdate(
      { _id: events[i]._id },
      { $set: eventToSet, ...(unset && { $unset: unset }) }
    ));
  }
  await Promise.all(promises);

  await RepetitionsHelper.updateRepetitions(eventPayload, event.repetition.parentId);

  return event;
};

exports.deleteRepetition = async (event, credentials) => {
  const { type, repetition } = event;
  if (type !== ABSENCE && repetition && repetition.frequency !== NEVER) {
    await EventHistoriesHelper.createEventHistoryOnDelete(event, credentials);

    await Event.deleteMany({
      'repetition.parentId': event.repetition.parentId,
      startDate: { $gte: new Date(event.startDate) },
      company: get(credentials, 'company._id'),
      $or: [{ isBilled: false }, { isBilled: { $exists: false } }],
    });

    await Repetition.deleteOne({ parentId: event.repetition.parentId });
  }

  return event;
};

exports.createFutureEventBasedOnRepetition = async (repetition) => {
  const { frequency, parentId, startDate, endDate } = repetition;
  const startDateObj = moment(startDate).toObject();
  const endDateObj = moment(endDate).toObject();
  const newEventStartDate = moment().add(90, 'd').set(pick(startDateObj, ['hours', 'minutes', 'seconds', 'milliseconds'])).toDate();
  const newEventEndDate = moment().add(90, 'd').set(pick(endDateObj, ['hours', 'minutes', 'seconds', 'milliseconds'])).toDate();
  const newEvent = {
    ...pick(repetition, ['type', 'customer', 'subscription', 'auxiliary', 'sector', 'status', 'misc', 'internalHour', 'address', 'company']),
    startDate: newEventStartDate,
    endDate: newEventEndDate,
    repetition: { frequency, parentId },
  };

  if (newEvent.type === INTERVENTION && newEvent.auxiliary && await EventsValidationHelper.hasConflicts(newEvent)) {
    delete newEvent.auxiliary;
    newEvent.repetition.frequency = NEVER;
  }

  return new Event(newEvent);
};
