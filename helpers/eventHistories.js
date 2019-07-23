const EventHistory = require('../models/EventHistory');
const { EVENT_CREATION, EVENT_DELETION } = require('./constants');
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

const createEventHistory = async (payload, credentials, action) => {
  const { _id: createdBy } = credentials;
  const { customer, startDate, type, auxiliary, sector } = payload;

  const eventHistory = new EventHistory({
    createdBy,
    action,
    event: { type, startDate, customer, auxiliary },
    auxiliaries: [auxiliary],
    sectors: [sector],
  });

  await eventHistory.save();
};

exports.createEventHistoryOnCreate = async (payload, credentials) => createEventHistory(payload, credentials, EVENT_CREATION);

exports.createEventHistoryOnDelete = async (payload, credentials) => createEventHistory(payload, credentials, EVENT_DELETION);
