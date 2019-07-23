const EventHistory = require('../models/EventHistory');
const { EVENT_CREATION } = require('./constants');
const { formatArrayOrStringQueryParam } = require('./utils');

exports.getListQuery = (query) => {
  const rules = [];
  const { sectors, auxiliaries } = query;

  if (sectors) {
    const sectorCondition = formatArrayOrStringQueryParam(sectors, 'sectors');
    rules.push({ $or: sectorCondition });
  }
  if (auxiliaries) {
    const auxiliaryCondition = formatArrayOrStringQueryParam(auxiliaries, 'auxiliaries');
    rules.push({ $or: auxiliaryCondition });
  }

  return rules.length > 0 ? { $and: rules } : {};
};

exports.createEventHistory = async (payload, credentials) => {
  const { _id: createdBy } = credentials;
  const { customer, startDate, type, auxiliary, sector } = payload;

  const eventHistory = new EventHistory({
    createdBy,
    action: EVENT_CREATION,
    event: { type, startDate, customer, auxiliary },
    auxiliaries: [auxiliary],
    sectors: [sector],
  });

  await eventHistory.save();
};
