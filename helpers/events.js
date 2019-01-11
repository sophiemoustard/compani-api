const Boom = require('boom');
const translate = require('../helpers/translate');

const { language } = translate;

const populateEventSubscription = (event) => {
  if (event.type !== 'intervention') return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions
    .find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.notFound(translate[language].subscriptionNotFound);

  event.subscription = subscription;

  return event;
};

const populateEventsListSubscription = events => events.map(event => populateEventSubscription(event.toObject()));

module.exports = {
  populateEventSubscription,
  populateEventsListSubscription,
};
