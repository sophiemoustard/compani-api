const EventHistory = require('../models/EventHistory');
const { EVENT_CREATION } = require('./constants');

exports.createEventHistory = async (payload, credentials) => {
  const { _id: createdBy } = credentials;
  const { customer, startDate, type, auxiliary, sector } = payload;

  const eventHistory = new EventHistory({
    createdBy,
    action: EVENT_CREATION,
    event: { type, startDate, customer },
    auxiliaries: [auxiliary],
    sectors: [sector],
  });

  await eventHistory.save();
};
