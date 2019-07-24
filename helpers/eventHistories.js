const EventHistory = require('../models/EventHistory');
const { EVENT_CREATION, EVENT_DELETION } = require('./constants');
const { formatArrayOrStringQueryParam } = require('./utils');

exports.getListQuery = (query) => {
  const rules = [];
  const { sectors, auxiliaries } = query;

  if (sectors) rules.push(...formatArrayOrStringQueryParam(sectors, 'sectors'));
  if (auxiliaries) rules.push(...formatArrayOrStringQueryParam(auxiliaries, 'auxiliaries'));

  return rules.length > 0 ? { $or: rules } : {};
};

const createEventHistory = async (payload, credentials, action) => {
  const { _id: createdBy } = credentials;
  const { customer, startDate, endDate, type, auxiliary, sector, absence, internalHour, location, misc, repetition } = payload;

  const eventHistory = new EventHistory({
    createdBy,
    action,
    event: {
      type,
      startDate,
      endDate,
      customer,
      auxiliary,
      absence,
      internalHour,
      location,
      misc,
      repetition,
    },
    ...(auxiliary && { auxiliaries: [auxiliary] }),
    sectors: [sector],
  });

  await eventHistory.save();
};

exports.createEventHistoryOnCreate = async (payload, credentials) => createEventHistory(payload, credentials, EVENT_CREATION);

exports.createEventHistoryOnDelete = async (payload, credentials) => createEventHistory(payload, credentials, EVENT_DELETION);
