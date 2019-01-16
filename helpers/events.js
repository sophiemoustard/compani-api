const Boom = require('boom');
const moment = require('moment');
const {
  INTERVENTION,
  INTERNAL_HOUR,
} = require('./constants');
const Event = require('../models/Event');

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

const setInternalHourTypeToDefault = async (deletedInternalHourId, defaultInternalHour) => {
  const payload = { internalHour: defaultInternalHour };
  await Event.update(
    {
      type: INTERNAL_HOUR,
      'internalHour._id': deletedInternalHourId,
      startDate: { $gte: moment().toDate() }
    },
    { $set: payload },
    { multi: true },
  );
};

module.exports = {
  populateEventSubscription,
  populateEvents,
  setInternalHourTypeToDefault,
};
