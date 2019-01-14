const Boom = require('boom');
const { INTERVENTION } = require('./constants');

const populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.conflict();

  const subscription = event.customer.subscriptions
    .find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.conflict();

  return { ...event, subscription };
};

const populateEventsListSubscription = events => events.map(event => populateEventSubscription(event));

module.exports = {
  populateEventSubscription,
  populateEventsListSubscription,
};
