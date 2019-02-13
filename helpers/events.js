const Boom = require('boom');
const moment = require('moment');
const flat = require('flat');
const _ = require('lodash');
const momentRange = require('moment-range');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
} = require('./constants');
const Event = require('../models/Event');

momentRange.extendMoment(moment);

const populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions
    .find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.badImplementation();

  return { ...event, subscription };
};

const populateEvents = async (events) => {
  const populatedEvents = [];
  for (let i = 0; i < events.length; i++) {
    const event = await populateEventSubscription(events[i]);
    populatedEvents.push(event);
  }

  return populatedEvents;
};

const updateEventsInternalHourType = async (oldInternalHourId, newInternalHour) => {
  const payload = { internalHour: newInternalHour };
  await Event.update(
    {
      type: INTERNAL_HOUR,
      'internalHour._id': oldInternalHourId,
      startDate: { $gte: moment().toDate() }
    },
    { $set: payload },
    { multi: true },
  );
};

const createRepetitionsEveryDay = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('days'));
  const promises = [];
  range.forEach((day, index) => {
    const repeatedEvent = new Event({
      ..._.omit(event, '_id'),
      startDate: moment(event.startDate).add(index + 1, 'd'),
      endDate: moment(event.endDate).add(index + 1, 'd'),
    });

    promises.push(repeatedEvent.save());
  });

  return Promise.all(promises);
};

const createRepetitionsEveryWeekDay = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('days'));
  const promises = [];
  range.forEach((day, index) => {
    if (moment(day).day() !== 0 && moment(day).day() !== 6) {
      const repeatedEvent = new Event({
        ..._.omit(event, '_id'),
        startDate: moment(event.startDate).add(index + 1, 'd'),
        endDate: moment(event.endDate).add(index + 1, 'd'),
      });

      promises.push(repeatedEvent.save());
    }
  });

  return Promise.all(promises);
};

const createRepetitionsEveryWeek = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('weeks'));
  const promises = [];
  range.forEach((day, index) => {
    const repeatedEvent = new Event({
      ..._.omit(event, '_id'),
      startDate: moment(event.startDate).add(index + 1, 'w'),
      endDate: moment(event.endDate).add(index + 1, 'w'),
    });

    promises.push(repeatedEvent.save());
  });

  return Promise.all(promises);
};

const createRepetitions = async (event) => {
  if (event.repetition.frequency === NEVER) return event;

  event.repetition.parentId = event._id;
  await Event.findOneAndUpdate({ _id: event._id }, { 'repetition.parentId': event._id });

  switch (event.repetition.frequency) {
    case EVERY_DAY:
      await createRepetitionsEveryDay(event);
      break;
    case EVERY_WEEK_DAY:
      await createRepetitionsEveryWeekDay(event);
      break;
    case EVERY_WEEK:
      await createRepetitionsEveryWeek(event);
      break;
    default:
      break;
  }

  return event;
};

const updateRepetitions = async (event, payload) => {
  const parentStartDate = moment(payload.startDate);
  const parentEndtDate = moment(payload.endDate);
  const promises = [];

  const events = await Event.find({ 'repetition.parentId': event.repetition.parentId, startDate: { $gt: new Date(event.startDate) } });
  events.forEach((ev) => {
    const startDate = moment(ev.startDate).hours(parentStartDate.hours());
    startDate.minutes(parentStartDate.minutes());
    const endDate = moment(ev.endDate).hours(parentEndtDate.hours());
    endDate.minutes(parentEndtDate.minutes());
    promises.push(Event.findOneAndUpdate(
      { _id: ev._id },
      { $set: flat({ ...payload, startDate: startDate.toISOString(), endDate: endDate.toISOString() }) }
    ));
  });

  return Promise.all(promises);
};

const deleteRepetition = async (event) => {
  await Event.deleteMany({ 'repetition.parentId': event.repetition.parentId, startDate: { $gt: new Date(event.startDate) } });
};

module.exports = {
  populateEventSubscription,
  populateEvents,
  updateEventsInternalHourType,
  createRepetitions,
  updateRepetitions,
  deleteRepetition,
};
