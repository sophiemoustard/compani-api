const moment = require('moment');
const get = require('lodash/get');
const { ObjectID } = require('mongodb');
const EventHistory = require('../models/EventHistory');
const { EVENT_CREATION, EVENT_DELETION, EVENT_UPDATE, INTERNAL_HOUR, ABSENCE } = require('./constants');
const UtilsHelper = require('./utils');
const EventHistoryRepository = require('../repositories/EventHistoryRepository');

exports.getEventHistories = async (query, credentials) => {
  const { createdAt } = query;
  const listQuery = exports.getListQuery(query, credentials);

  return EventHistoryRepository.paginate(listQuery, createdAt);
};

exports.getListQuery = (query, credentials) => {
  const queryCompany = { company: new ObjectID(get(credentials, 'company._id', null)) };
  const andRules = [queryCompany];
  const orRules = [];
  const { sectors, auxiliaries, createdAt } = query;

  if (sectors) orRules.push(...UtilsHelper.formatArrayOrStringQueryParam(sectors, 'sectors'));
  if (auxiliaries) orRules.push(...UtilsHelper.formatArrayOrStringQueryParam(auxiliaries, 'auxiliaries'));
  if (createdAt) andRules.push({ createdAt: { $lte: createdAt } });

  return orRules.length > 0 ? { $and: andRules.concat([{ $or: orRules }]) } : { $and: andRules };
};

exports.createEventHistory = async (payload, credentials, action) => {
  const { _id: createdBy } = credentials;
  const {
    customer,
    startDate,
    endDate,
    type,
    auxiliary,
    sector,
    absence,
    internalHour,
    address,
    misc,
    repetition,
  } = payload;

  const eventHistory = new EventHistory({
    company: get(credentials, 'company._id', null),
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
      address,
      misc,
      repetition,
    },
    ...(auxiliary && { auxiliaries: [auxiliary] }),
    sectors: [sector],
  });

  await eventHistory.save();
};

exports.createEventHistoryOnCreate = async (payload, credentials) =>
  exports.createEventHistory(payload, credentials, EVENT_CREATION);

exports.createEventHistoryOnDelete = async (payload, credentials) =>
  exports.createEventHistory(payload, credentials, EVENT_DELETION);

exports.createEventHistoryOnUpdate = async (payload, event, credentials) => {
  const promises = [];
  const { _id: createdBy } = credentials;
  const { customer, type, repetition } = event;
  const { startDate, endDate, misc } = payload;

  const eventHistory = {
    company: get(credentials, 'company._id', null),
    createdBy,
    action: EVENT_UPDATE,
    event: {
      type,
      startDate,
      endDate,
      customer,
      misc,
    },
  };
  if (payload.shouldUpdateRepetition) eventHistory.event.repetition = repetition;
  if (event.type === INTERNAL_HOUR) eventHistory.event.internalHour = payload.internalHour || event.internalHour;
  if (event.type === ABSENCE) eventHistory.event.absence = payload.absence || event.absence;

  if ((event.auxiliary && event.auxiliary.toHexString() !== payload.auxiliary)
    || (!event.auxiliary && payload.auxiliary)) {
    const auxiliaryUpdateHistory = exports.formatEventHistoryForAuxiliaryUpdate(eventHistory, payload, event);
    promises.push(new EventHistory(auxiliaryUpdateHistory).save());
  }

  if (!moment(event.startDate).isSame(payload.startDate, 'day')
  || !moment(event.endDate).isSame(payload.endDate, 'day')) {
    const datesUpdateHistory = exports.formatEventHistoryForDatesUpdate(eventHistory, payload, event);
    promises.push(new EventHistory(datesUpdateHistory).save());
  } else {
    const eventStartHour = moment(event.startDate).format('HH:mm');
    const eventEndHour = moment(event.endDate).format('HH:mm');
    const payloadStartHour = moment(payload.startDate).format('HH:mm');
    const payloadEndHour = moment(payload.endDate).format('HH:mm');

    if (eventStartHour !== payloadStartHour || eventEndHour !== payloadEndHour) {
      const hoursUpdateHistory = exports.formatEventHistoryForHoursUpdate(eventHistory, payload, event);
      promises.push(new EventHistory(hoursUpdateHistory).save());
    }
  }

  if (payload.isCancelled && !event.isCancelled) {
    const cancelUpdateHistory = exports.formatEventHistoryForCancelUpdate(eventHistory, payload, event);
    promises.push(new EventHistory(cancelUpdateHistory).save());
  }

  await Promise.all(promises);
};

exports.formatEventHistoryForAuxiliaryUpdate = (mainInfo, payload, event) => {
  const auxiliaryUpdateHistory = { ...mainInfo };
  if (event.auxiliary && payload.auxiliary) {
    auxiliaryUpdateHistory.auxiliaries = [event.auxiliary.toHexString(), payload.auxiliary];
    auxiliaryUpdateHistory.update = {
      auxiliary: { from: event.auxiliary.toHexString(), to: payload.auxiliary },
    };
  } else if (event.auxiliary) {
    auxiliaryUpdateHistory.auxiliaries = [event.auxiliary.toHexString()];
    auxiliaryUpdateHistory.update = {
      auxiliary: { from: event.auxiliary.toHexString() },
    };
  } else if (payload.auxiliary) {
    auxiliaryUpdateHistory.auxiliaries = [payload.auxiliary];
    auxiliaryUpdateHistory.update = {
      auxiliary: { to: payload.auxiliary },
    };
  }

  if (!payload.sector
    || event.sector.toHexString() === payload.sector)auxiliaryUpdateHistory.sectors = [event.sector.toHexString()];
  else auxiliaryUpdateHistory.sectors = [event.sector.toHexString(), payload.sector];

  return auxiliaryUpdateHistory;
};

exports.formatEventHistoryForDatesUpdate = (mainInfo, payload, event) => {
  const datesUpdateHistory = {
    ...mainInfo,
    sectors: payload.sector ? [payload.sector] : [],
    update: {
      startDate: { from: event.startDate, to: payload.startDate },
    },
  };

  const isOneDayEvent = moment(event.endDate).isSame(event.startDate, 'day')
    && moment(payload.endDate).isSame(payload.startDate, 'day');
  if (!isOneDayEvent) datesUpdateHistory.update.endDate = { from: event.endDate, to: payload.endDate };

  if (payload.auxiliary) {
    datesUpdateHistory.auxiliaries = [payload.auxiliary];
    datesUpdateHistory.event.auxiliary = payload.auxiliary;
  }

  return datesUpdateHistory;
};

exports.formatEventHistoryForHoursUpdate = (mainInfo, payload, event) => {
  const hoursUpdateHistory = {
    ...mainInfo,
    sectors: payload.sector ? [payload.sector] : [],
    update: {
      startHour: { from: event.startDate, to: payload.startDate },
      endHour: { from: event.endDate, to: payload.endDate },
    },
  };

  if (payload.auxiliary) {
    hoursUpdateHistory.auxiliaries = [payload.auxiliary];
    hoursUpdateHistory.event.auxiliary = payload.auxiliary;
  }

  return hoursUpdateHistory;
};

exports.formatEventHistoryForCancelUpdate = (mainInfo, payload) => {
  const { cancel } = payload;
  const datesUpdateHistory = {
    ...mainInfo,
    sectors: payload.sector ? [payload.sector] : [],
    update: { cancel },
  };

  if (payload.auxiliary) {
    datesUpdateHistory.auxiliaries = [payload.auxiliary];
    datesUpdateHistory.event.auxiliary = payload.auxiliary;
  }

  return datesUpdateHistory;
};
