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
const User = require('../models/User');
const Repetition = require('../models/Repetition');
const EventHistoriesHelper = require('./eventHistories');
const EventsHelper = require('./events');
const RepetitionsHelper = require('./repetitions');
const EventsValidationHelper = require('./eventsValidation');
const DatesHelper = require('./dates');

momentRange.extendMoment(moment);

exports.formatRepeatedPayload = async (event, sector, momentDay) => {
  const step = DatesHelper.dayDiffRegardlessOfHour(momentDay, event.startDate);
  let payload = {
    ...cloneDeep(omit(event, '_id')), // cloneDeep necessary to copy repetition
    startDate: moment(event.startDate).add(step, 'd'),
    endDate: moment(event.endDate).add(step, 'd'),
  };
  const hasConflicts = await EventsValidationHelper.hasConflicts(payload);

  if (event.type === INTERVENTION && event.auxiliary && hasConflicts) {
    payload = { ...omit(payload, 'auxiliary'), 'repetition.frequency': NEVER, sector };
  } else if (([INTERNAL_HOUR, UNAVAILABILITY].includes(event.type)) && hasConflicts) return null;

  return new Event(payload);
};

exports.createRepetitionsEveryDay = async (payload, sector, startDate = null, endDate = null) => {
  const start = startDate || moment(payload.startDate).add(1, 'd');
  const end = endDate || moment(payload.startDate).add(90, 'd');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const repeatedEvent = await exports.formatRepeatedPayload(payload, sector, range[i]);
    if (repeatedEvent) repeatedEvents.push(repeatedEvent);
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsEveryWeekDay = async (payload, sector) => {
  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(90, 'd');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const day = moment(range[i]).day();
    if (day !== 0 && day !== 6) {
      const repeatedEvent = await exports.formatRepeatedPayload(payload, sector, range[i]);
      if (repeatedEvent) repeatedEvents.push(repeatedEvent);
    }
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsByWeek = async (payload, sector, step) => {
  const start = moment(payload.startDate).add(step, 'w');
  const end = moment(payload.startDate).add(90, 'd');
  const range = Array.from(moment().range(start, end).by('weeks', { step }));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const repeatedEvent = await exports.formatRepeatedPayload(payload, sector, range[i]);
    if (repeatedEvent) repeatedEvents.push(repeatedEvent);
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitions = async (eventFromDb, payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  if (payload.repetition.frequency === NEVER) return eventFromDb;

  if (get(eventFromDb, 'repetition.frequency', NEVER) !== NEVER) {
    await Event.updateOne({ _id: eventFromDb._id }, { 'repetition.parentId': eventFromDb._id });
  }
  let sectorId = eventFromDb.sector;
  if (!eventFromDb.sector) {
    const user = await User.findOne({ _id: eventFromDb.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });
    sectorId = user.sector;
  }

  switch (payload.repetition.frequency) {
    case EVERY_DAY:
      await exports.createRepetitionsEveryDay(payload, sectorId);
      break;
    case EVERY_WEEK_DAY:
      await exports.createRepetitionsEveryWeekDay(payload, sectorId);
      break;
    case EVERY_WEEK:
      await exports.createRepetitionsByWeek(payload, sectorId, 1);
      break;
    case EVERY_TWO_WEEKS:
      await exports.createRepetitionsByWeek(payload, sectorId, 2);
      break;
    default:
      break;
  }

  await (new Repetition({ ...payload, ...payload.repetition })).save();

  return eventFromDb;
};

exports.updateRepetition = async (eventFromDb, eventPayload, credentials) => {
  const parentStartDate = moment(eventPayload.startDate);
  const parentEndDate = moment(eventPayload.endDate);
  const promises = [];
  const companyId = get(credentials, 'company._id', null);

  const query = {
    'repetition.parentId': eventFromDb.repetition.parentId,
    'repetition.frequency': { $not: { $eq: NEVER } },
    startDate: { $gte: new Date(eventFromDb.startDate) },
    company: companyId,
  };
  const events = await Event.find(query).lean();

  let sectorId = eventFromDb.sector;
  if (!eventFromDb.sector) {
    const user = await User.findOne({ _id: eventFromDb.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean();
    sectorId = user.sector;
  }

  for (let i = 0, l = events.length; i < l; i++) {
    const startDate = moment(events[i].startDate).hours(parentStartDate.hours())
      .minutes(parentStartDate.minutes()).toISOString();
    const endDate = moment(events[i].endDate).hours(parentEndDate.hours())
      .minutes(parentEndDate.minutes()).toISOString();
    let eventToSet = { ...eventPayload, startDate, endDate, _id: events[i]._id };

    const hasConflicts = await EventsValidationHelper.hasConflicts({ ...eventToSet, company: companyId });
    const detachFromRepetition = !!eventPayload.auxiliary && eventFromDb.type === INTERVENTION && hasConflicts;
    if (detachFromRepetition || !eventPayload.auxiliary) {
      eventToSet = { ...omit(eventToSet, 'auxiliary'), sector: sectorId };
    }

    const payload = EventsHelper.formatEditionPayload(events[i], eventToSet, detachFromRepetition);
    promises.push(Event.updateOne({ _id: events[i]._id }, payload));
  }
  await Promise.all([
    ...promises,
    RepetitionsHelper.updateRepetitions(eventPayload, eventFromDb.repetition.parentId),
  ]);

  return eventFromDb;
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

exports.formatEventBasedOnRepetition = async (repetition, date) => {
  const { frequency, parentId, startDate, endDate } = repetition;
  const startDateObj = moment(startDate).toObject();
  const endDateObj = moment(endDate).toObject();
  const timeFields = ['hours', 'minutes', 'seconds', 'milliseconds'];
  const newEventStartDate = moment(date).add(90, 'd').set(pick(startDateObj, timeFields)).toDate();
  const newEventEndDate = moment(date).add(90, 'd').set(pick(endDateObj, timeFields)).toDate();
  const pickedFields = [
    'type',
    'customer',
    'subscription',
    'auxiliary',
    'sector',
    'misc',
    'internalHour',
    'address',
    'company',
  ];
  let newEvent = {
    ...pick(cloneDeep(repetition), pickedFields),
    startDate: newEventStartDate,
    endDate: newEventEndDate,
    repetition: { frequency, parentId },
  };

  const hasConflicts = await EventsValidationHelper.hasConflicts(newEvent);
  if ([INTERNAL_HOUR, UNAVAILABILITY].includes(newEvent.type) && hasConflicts) return null;

  if (newEvent.type === INTERVENTION && newEvent.auxiliary && hasConflicts) {
    newEvent = await EventsHelper.detachAuxiliaryFromEvent(newEvent, repetition.company);
  }

  return newEvent;
};
