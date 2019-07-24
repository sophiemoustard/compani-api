const EventHistory = require('../models/EventHistory');
const { EVENT_CREATION, EVENT_DELETION, EVENT_UPDATE } = require('./constants');
const UtilsHelper = require('./utils');

exports.getListQuery = (query) => {
  const rules = [];
  const { sectors, auxiliaries } = query;

  if (sectors) rules.push(...UtilsHelper.formatArrayOrStringQueryParam(sectors, 'sectors'));
  if (auxiliaries) rules.push(...UtilsHelper.formatArrayOrStringQueryParam(auxiliaries, 'auxiliaries'));

  return rules.length > 0 ? { $or: rules } : {};
};

exports.createEventHistory = async (payload, credentials, action) => {
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

exports.createEventHistoryOnCreate = async (payload, credentials) => exports.createEventHistory(payload, credentials, EVENT_CREATION);

exports.createEventHistoryOnDelete = async (payload, credentials) => exports.createEventHistory(payload, credentials, EVENT_DELETION);

exports.createEventHistoryOnUpdate = async (payload, event, credentials) => {
  const promises = [];
  const { _id: createdBy } = credentials;
  const { customer, type } = event;
  const { startDate, endDate, misc } = payload;
  const eventHistory = {
    createdBy,
    action: EVENT_UPDATE,
    event: {
      type,
      startDate,
      endDate,
      customer,
      misc,
      internalHour: payload.internalHour || event.internalHour,
    },
  };

  if (event.auxiliary.toHexString() !== payload.auxiliary) {
    const auxiliaryUpdateHistory = exports.formatEventHistoryForAuxiliaryUpdate(eventHistory, payload, event);
    promises.push((new EventHistory(auxiliaryUpdateHistory)).save());
  }

  await Promise.all(promises);
};

exports.formatEventHistoryForAuxiliaryUpdate = (mainInfo, payload, event) => {
  const auxiliaryUpdateHistory = {
    ...mainInfo,
    auxiliaries: [event.auxiliary.toHexString(), payload.auxiliary],
    update: {
      auxiliary: { from: event.auxiliary.toHexString(), to: payload.auxiliary },
    },
  };
  if (!payload.sector || event.sector.toHexString() === payload.sector) auxiliaryUpdateHistory.sectors = [event.sector.toHexString()];
  else auxiliaryUpdateHistory.sectors = [event.sector.toHexString(), payload.sector];

  return auxiliaryUpdateHistory;
};
