const get = require('lodash/get');
const has = require('lodash/has');
const pickBy = require('lodash/pickBy');
const omit = require('lodash/omit');
const EventHistory = require('../models/EventHistory');
const Event = require('../models/Event');
const User = require('../models/User');
const {
  EVENT_CREATION,
  EVENT_DELETION,
  EVENT_UPDATE,
  INTERNAL_HOUR,
  ABSENCE,
  TIME_STAMP_CANCELLATION,
} = require('./constants');
const UtilsHelper = require('./utils');
const EventHistoryRepository = require('../repositories/EventHistoryRepository');
const { CompaniDate } = require('./dates/companiDates');

exports.PROJECTION_FIELDS = {
  _id: 1,
  customer: 1,
  startDate: 1,
  endDate: 1,
  type: 1,
  absence: 1,
  internalHour: 1,
  address: 1,
  misc: 1,
  repetition: 1,
  sector: 1,
  auxiliary: 1,
  isBilled: 1,
};

exports.list = async (query, credentials) => {
  if (query.eventId) {
    return EventHistoryRepository.paginate({
      'event.eventId': query.eventId,
      company: get(credentials, 'company._id'),
      ...(query.action && { action: { $in: query.action } }),
      ...(has(query, 'isCancelled') && { isCancelled: get(query, 'isCancelled') }),
    });
  }

  const listQuery = exports.getListQuery(query, credentials);
  return EventHistoryRepository.paginate(listQuery, 20);
};

exports.getListQuery = (query, credentials) => {
  const { sectors, auxiliaries, createdAt, action } = query;
  const listQuery = { company: get(credentials, 'company._id', null) };
  if (createdAt) listQuery.createdAt = { $lt: createdAt };
  if (action) listQuery.action = { $in: action };

  const orRules = [];
  if (sectors) orRules.push(...UtilsHelper.formatArrayOrStringQueryParam(sectors, 'sectors'));
  if (auxiliaries) orRules.push(...UtilsHelper.formatArrayOrStringQueryParam(auxiliaries, 'auxiliaries'));

  if (orRules.length === 0) return listQuery;
  if (orRules.length === 1) return { ...listQuery, ...orRules[0] };

  return { ...listQuery, $or: orRules };
};

exports.createEventHistory = async (payload, credentials, action) => {
  const { _id: createdBy } = credentials;
  const {
    _id: eventId,
    customer,
    startDate,
    endDate,
    type,
    absence,
    internalHour,
    address,
    misc,
    repetition,
  } = payload;

  const eventHistory = {
    company: get(credentials, 'company._id', null),
    createdBy,
    action,
    event: pickBy({ eventId, type, startDate, endDate, customer, absence, internalHour, misc, repetition }),
  };

  if (address && Object.keys(address).length) eventHistory.event.address = address;
  if (payload.sector) eventHistory.sectors = [payload.sector];
  if (payload.auxiliary) {
    eventHistory.auxiliaries = [payload.auxiliary];
    eventHistory.event.auxiliary = payload.auxiliary;
    const aux = await User.findOne({ _id: payload.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id', null) } })
      .lean({ autopopulate: true, virtuals: true });
    eventHistory.sectors = [aux.sector.toHexString()];
  }

  await EventHistory.create(eventHistory);
};

exports.createEventHistoryOnCreate = async (payload, credentials) =>
  exports.createEventHistory(payload, credentials, EVENT_CREATION);

exports.createEventHistoryOnDelete = async (payload, credentials) =>
  exports.createEventHistory(payload, credentials, EVENT_DELETION);

const areDaysChanged = (event, payload) => !CompaniDate(event.startDate).isSame(payload.startDate, 'day') ||
  !CompaniDate(event.endDate).isSame(payload.endDate, 'day');

const isAuxiliaryUpdated = (event, payload) => (!event.auxiliary && payload.auxiliary) ||
  (event.auxiliary && !UtilsHelper.areObjectIdsEquals(event.auxiliary, payload.auxiliary));

const areHoursChanged = (event, payload) => {
  const eventStartHour = CompaniDate(event.startDate).format('HH:mm');
  const eventEndHour = CompaniDate(event.endDate).format('HH:mm');
  const payloadStartHour = CompaniDate(payload.startDate).format('HH:mm');
  const payloadEndHour = CompaniDate(payload.endDate).format('HH:mm');

  return eventStartHour !== payloadStartHour || eventEndHour !== payloadEndHour;
};

exports.createEventHistoryOnUpdate = async (payload, event, credentials) => {
  const { _id: createdBy } = credentials;
  const { customer, type, repetition } = event;
  const { startDate, endDate, misc } = payload;
  const companyId = get(credentials, 'company._id', null);

  const history = {
    company: companyId,
    createdBy,
    action: EVENT_UPDATE,
    event: { eventId: event._id, type, startDate, endDate, customer, misc },
  };
  if (payload.shouldUpdateRepetition) history.event.repetition = repetition;
  if (event.type === INTERNAL_HOUR) history.event.internalHour = payload.internalHour || event.internalHour;
  if (event.type === ABSENCE) history.event.absence = payload.absence || event.absence;

  const promises = [];
  if (isAuxiliaryUpdated(event, payload)) {
    const auxiliaryUpdateHistory = await exports.formatHistoryForAuxiliaryUpdate(history, payload, event, companyId);
    promises.push(new EventHistory(auxiliaryUpdateHistory).save());
  }
  if (areDaysChanged(event, payload)) {
    const datesUpdateHistory = await exports.formatHistoryForDatesUpdate(history, payload, event, companyId);
    promises.push(new EventHistory(datesUpdateHistory).save());
  } else if (areHoursChanged(event, payload)) {
    const hoursUpdateHistory = await exports.formatHistoryForHoursUpdate(history, payload, event, companyId);
    promises.push(new EventHistory(hoursUpdateHistory).save());
  }
  if (payload.isCancelled && !event.isCancelled) {
    const cancelUpdateHistory = await exports.formatHistoryForCancelUpdate(history, payload, companyId);
    promises.push(new EventHistory(cancelUpdateHistory).save());
  }

  await Promise.all(promises);
};

exports.formatHistoryForAuxiliaryUpdate = async (mainInfo, payload, event, companyId) => {
  const sectors = [];
  let auxiliaries = [];
  let update = [];
  if (event.auxiliary && payload.auxiliary) {
    auxiliaries = [event.auxiliary, payload.auxiliary];
    update = { auxiliary: { from: event.auxiliary, to: payload.auxiliary } };

    const auxiliaryList = await User.find({ _id: { $in: [event.auxiliary, payload.auxiliary] } })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });

    for (const aux of auxiliaryList) {
      if (!UtilsHelper.doesArrayIncludeId(sectors, aux.sector._id)) sectors.push(aux.sector._id);
    }
  } else if (event.auxiliary) {
    auxiliaries = [event.auxiliary];
    update = { auxiliary: { from: event.auxiliary } };

    const aux = await User.findOne({ _id: event.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });

    if (!UtilsHelper.doesArrayIncludeId(sectors, aux.sector)) sectors.push(aux.sector);
  } else if (payload.auxiliary) {
    auxiliaries = [payload.auxiliary];
    update = { auxiliary: { to: payload.auxiliary } };

    const aux = await User.findOne({ _id: payload.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });

    if (!UtilsHelper.doesArrayIncludeId(sectors, aux.sector)) sectors.push(aux.sector);
  }

  if (payload.sector && !UtilsHelper.doesArrayIncludeId(sectors, payload.sector)) sectors.push(payload.sector);
  if (event.sector && !UtilsHelper.doesArrayIncludeId(sectors, event.sector)) sectors.push(event.sector);

  return { ...mainInfo, sectors, auxiliaries, update };
};

const isOneDayEvent = (event, payload) => CompaniDate(event.endDate).isSame(event.startDate, 'day') &&
  CompaniDate(payload.endDate).isSame(payload.startDate, 'day');

exports.formatHistoryForDatesUpdate = async (mainInfo, payload, event, companyId) => {
  const datesUpdateHistory = {
    ...mainInfo,
    update: { startDate: { from: event.startDate, to: payload.startDate } },
  };

  if (payload.sector) datesUpdateHistory.sectors = [payload.sector];
  else {
    const aux = await User.findOne({ _id: payload.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });
    datesUpdateHistory.sectors = [aux.sector.toHexString()];
    datesUpdateHistory.auxiliaries = [payload.auxiliary];
    datesUpdateHistory.event.auxiliary = payload.auxiliary;
  }

  if (!isOneDayEvent(event, payload)) datesUpdateHistory.update.endDate = { from: event.endDate, to: payload.endDate };

  return datesUpdateHistory;
};

exports.formatHistoryForHoursUpdate = async (mainInfo, payload, event, companyId) => {
  const hoursUpdateHistory = {
    ...mainInfo,
    update: {
      startHour: { from: event.startDate, to: payload.startDate },
      endHour: { from: event.endDate, to: payload.endDate },
    },
  };

  if (payload.sector) hoursUpdateHistory.sectors = [payload.sector];
  else {
    const aux = await User.findOne({ _id: payload.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });
    hoursUpdateHistory.sectors = [aux.sector.toHexString()];
    hoursUpdateHistory.auxiliaries = [payload.auxiliary];
    hoursUpdateHistory.event.auxiliary = payload.auxiliary;
  }

  return hoursUpdateHistory;
};

exports.formatHistoryForCancelUpdate = async (mainInfo, payload, companyId) => {
  const { cancel } = payload;
  const datesUpdateHistory = { ...mainInfo, update: { cancel } };

  if (payload.sector) datesUpdateHistory.sectors = [payload.sector];
  else {
    const aux = await User.findOne({ _id: payload.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });
    datesUpdateHistory.sectors = [aux.sector.toHexString()];
    datesUpdateHistory.auxiliaries = [payload.auxiliary];
    datesUpdateHistory.event.auxiliary = payload.auxiliary;
  }

  return datesUpdateHistory;
};

exports.createTimeStampCancellationHistory = async (eventHistoryId, payload, credentials) => {
  const eventHistory = await EventHistory.findOne({ _id: eventHistoryId }).lean();
  const event = await Event.findOne({ _id: eventHistory.event.eventId }).lean();

  let sectors;
  if (event.auxiliary) {
    const auxiliary = await User.findOne({ _id: event.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .lean();
    sectors = [auxiliary.sector];
  } else {
    sectors = [event.sector];
  }

  await EventHistory.create({
    action: TIME_STAMP_CANCELLATION,
    createdBy: credentials._id,
    company: credentials.company._id,
    event: { ...omit(event, ['_id']), eventId: event._id },
    linkedEventHistory: eventHistoryId,
    timeStampCancellationReason: payload.timeStampCancellationReason,
    auxiliaries: event.auxiliary ? [event.auxiliary] : [],
    sectors,
  });
};

exports.update = async (eventHistoryId, payload, credentials) => {
  await this.createTimeStampCancellationHistory(eventHistoryId, payload, credentials);

  return EventHistory.updateOne(
    { _id: eventHistoryId },
    { $set: { isCancelled: payload.isCancelled } }
  );
};
