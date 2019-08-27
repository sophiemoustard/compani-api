const moment = require('moment');
const flat = require('flat');
const _ = require('lodash');
const momentRange = require('moment-range');
const {
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
  EVERY_TWO_WEEKS,
  ABSENCE,
} = require('./constants');
const Event = require('../models/Event');
const EventHistoriesHelper = require('./eventHistories');
const EventsValidationHelper = require('./eventsValidation');

momentRange.extendMoment(moment);

exports.formatRepeatedPayload = async (event, momentDay) => {
  const step = momentDay.diff(event.startDate, 'd');
  const payload = {
    ..._.omit(event, '_id'),
    startDate: moment(event.startDate).add(step, 'd'),
    endDate: moment(event.endDate).add(step, 'd'),
  };

  if (await EventsValidationHelper.hasConflicts(payload)) {
    delete payload.auxiliary;
    delete payload.repetition;
  }

  return new Event(payload);
};

exports.createRepetitionsEveryDay = async (payload) => {
  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(3, 'M').endOf('M');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    repeatedEvents.push(await exports.formatRepeatedPayload(payload, range[i]));
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsEveryWeekDay = async (payload) => {
  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(3, 'M').endOf('M');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const day = moment(range[i]).day();
    if (day !== 0 && day !== 6) repeatedEvents.push(await exports.formatRepeatedPayload(payload, range[i]));
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsByWeek = async (payload, step) => {
  const start = moment(payload.startDate).add(step, 'w');
  const end = moment(payload.startDate).add(3, 'M').endOf('M');
  const range = Array.from(moment().range(start, end).by('weeks', { step }));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    repeatedEvents.push(await exports.formatRepeatedPayload(payload, range[i]));
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitions = async (eventFromDb, payload) => {
  if (payload.repetition.frequency === NEVER) return eventFromDb;

  if (_.get(eventFromDb, 'repetition.frequency', NEVER) !== NEVER) {
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

  return eventFromDb;
};

exports.updateRepetitions = async (event, payload) => {
  const parentStartDate = moment(payload.startDate);
  const parentEndtDate = moment(payload.endDate);
  const promises = [];

  let unset;
  if (!payload.auxiliary) unset = { auxiliary: '' };
  const events = await Event.find({
    'repetition.parentId': event.repetition.parentId,
    startDate: { $gt: new Date(event.startDate) },
  });
  events.forEach((ev) => {
    const startDate = moment(ev.startDate).hours(parentStartDate.hours());
    startDate.minutes(parentStartDate.minutes());
    const endDate = moment(ev.endDate).hours(parentEndtDate.hours());
    endDate.minutes(parentEndtDate.minutes());
    promises.push(Event.findOneAndUpdate(
      { _id: ev._id },
      {
        $set: flat({ ...payload, startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
        ...(unset && { $unset: unset }),
      }
    ));
  });

  return Promise.all(promises);
};

exports.deleteRepetition = async (params, credentials) => {
  const event = await Event.findOne({ _id: params._id });
  if (!event) return null;

  await EventHistoriesHelper.createEventHistoryOnDelete(event, credentials);

  const { type, repetition } = event;
  if (type !== ABSENCE && repetition && repetition.frequency !== NEVER) {
    await Event.deleteMany({
      'repetition.parentId': event.repetition.parentId,
      startDate: { $gte: new Date(event.startDate) },
      $or: [{ isBilled: false }, { isBilled: { $exists: false } }],
    });
  }

  return event;
};
