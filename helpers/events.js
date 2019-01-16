const Boom = require('boom');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  UNAVAILABILITY,
  ABSENCE
} = require('./constants');
const Company = require('../models/Company');

const populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions
    .find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.badImplementation();

  return { ...event, subscription };
};

const populateEventInternalHour = async (event) => {
  if (event.type !== INTERNAL_HOUR) return event;
  if (!event.auxiliary || !event.auxiliary.company || !event.auxiliary.company) return Boom.badImplementation();

  const company = await Company.findOne({ _id: event.auxiliary.company });

  const internalHour = company.rhConfig.internalHours
    .find(hour => hour._id.toHexString() === event.internalHour.toHexString());
  if (!internalHour) throw Boom.badImplementation();

  return { ...event, internalHour };
};

const populateEvent = async (event) => {
  switch (event.type) {
    case INTERVENTION:
      return populateEventSubscription(event);
    case INTERNAL_HOUR:
      return populateEventInternalHour(event);
    case UNAVAILABILITY:
    case ABSENCE:
    default:
      return event;
  }
};

const populateEvents = async (events) => {
  const populatedEvents = [];
  for (let i = 0; i < events.length; i++) {
    const event = await populateEvent(events[i]);
    populatedEvents.push(event);
  }

  return populatedEvents;
};

module.exports = {
  populateEvent,
  populateEvents,
};
