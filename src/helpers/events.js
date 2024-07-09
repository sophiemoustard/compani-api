const Boom = require('@hapi/boom');
const moment = require('moment');
const pick = require('lodash/pick');
const get = require('lodash/get');
const has = require('lodash/has');
const omit = require('lodash/omit');
const isEqual = require('lodash/isEqual');
const groupBy = require('lodash/groupBy');
const momentRange = require('moment-range');
const { ObjectId } = require('mongodb');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  UNAVAILABILITY,
  AUXILIARY,
  CUSTOMER,
} = require('./constants');
const UtilsHelper = require('./utils');
const EventHistoriesHelper = require('./eventHistories');
const EventsValidationHelper = require('./eventsValidation');
const DraftPayHelper = require('./draftPay');
const ContractHelper = require('./contracts');
const Event = require('../models/Event');
const Repetition = require('../models/Repetition');
const User = require('../models/User');
const DistanceMatrix = require('../models/DistanceMatrix');
const EventRepository = require('../repositories/EventRepository');
const UserCompany = require('../models/UserCompany');
const { CompaniDate } = require('./dates/companiDates');

momentRange.extendMoment(moment);

exports.isRepetition = event => has(event, 'repetition.frequency') && get(event, 'repetition.frequency') !== NEVER;

exports.list = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const eventsQuery = exports.getListQuery(query, credentials);

  // ATTENTION - Ne pas rajouter les virtuals start/endDateTimeStamp dans les populate des fonctions suivantes
  // car cela créé des soucis de performance sur les plannings / agendas
  if (query.groupBy === CUSTOMER) return EventRepository.getEventsGroupedByCustomers(eventsQuery, companyId);
  if (query.groupBy === AUXILIARY) return EventRepository.getEventsGroupedByAuxiliaries(eventsQuery, companyId);

  return exports.populateEvents(await EventRepository.getEventList(eventsQuery, companyId));
};

exports.detachAuxiliaryFromEvent = async (event, companyId) => {
  const auxiliary = await User.findOne({ _id: event.auxiliary })
    .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
    .lean({ autopopulate: true, virtuals: true });

  return {
    ...omit(event, 'auxiliary'),
    sector: auxiliary.sector,
    repetition: { ...event.repetition, frequency: NEVER },
  };
};

exports.deleteConflictInternalHoursAndUnavailabilities = async (event, auxiliary, credentials) => {
  const types = [INTERNAL_HOUR, UNAVAILABILITY];
  const dates = { startDate: event.startDate, endDate: event.endDate };
  const companyId = get(credentials, 'company._id', null);
  const query = await EventRepository.formatEventsInConflictQuery(dates, auxiliary._id, types, companyId, event._id);

  await exports.deleteEventsAndRepetition(query, false, credentials);
};

exports.getListQuery = (query, credentials) => {
  const rules = [{ company: new ObjectId(get(credentials, 'company._id', null)) }];
  const { auxiliary, type, customer, sector, startDate, endDate, isCancelled } = query;

  if (type) rules.push({ type });

  const sectorOrAuxiliary = [];
  if (auxiliary) {
    const auxiliaryCondition = UtilsHelper.formatObjectIdsArray(auxiliary);
    sectorOrAuxiliary.push({ auxiliary: { $in: auxiliaryCondition } });
  }
  if (sector) {
    const sectorCondition = UtilsHelper.formatObjectIdsArray(sector);
    sectorOrAuxiliary.push({ sector: { $in: sectorCondition } });
  }
  if (sectorOrAuxiliary.length > 0) rules.push({ $or: sectorOrAuxiliary });

  if (customer) {
    const customerCondition = UtilsHelper.formatObjectIdsArray(customer);
    rules.push({ customer: { $in: customerCondition } });
  }

  if (startDate) rules.push({ endDate: { $gt: moment(startDate).startOf('d').toDate() } });

  if (endDate) rules.push({ startDate: { $lt: moment(endDate).endOf('d').toDate() } });

  if (Object.keys(query).includes('isCancelled')) rules.push({ isCancelled });

  return { $and: rules };
};

exports.listForCreditNotes = (payload, credentials, creditNote) => {
  let query = {
    startDate: { $gte: moment(payload.startDate).startOf('d').toDate() },
    endDate: { $lte: moment(payload.endDate).endOf('d').toDate() },
    customer: payload.customer,
    type: INTERVENTION,
    company: get(credentials, 'company._id', null),
  };

  if (payload.thirdPartyPayer) query = { ...query, 'bills.thirdPartyPayer': payload.thirdPartyPayer };
  else {
    query = {
      ...query,
      'bills.inclTaxesCustomer': { $exists: true, $gt: 0 },
      'bills.inclTaxesTpp': { $exists: false },
    };
  }

  if (creditNote) {
    query = { ...query, $or: [{ isBilled: true }, { _id: { $in: creditNote.events.map(event => event.eventId) } }] };
  } else {
    query = { ...query, isBilled: true };
  }

  return Event.find(query).sort({ startDate: 1 }).lean();
};

exports.populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions
    .find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.badImplementation();

  const startDateTimeStamp = new Event(event).isStartDateTimeStamped();
  const endDateTimeStamp = new Event(event).isEndDateTimeStamped();

  return { ...event, startDateTimeStamp, endDateTimeStamp, subscription };
};

exports.populateEvents = async (events) => {
  const populatedEvents = [];
  for (let i = 0; i < events.length; i++) {
    const event = await exports.populateEventSubscription(events[i]);
    populatedEvents.push(event);
  }

  return populatedEvents;
};

exports.formatEditionPayload = (event, payload, detachFromRepetition) => {
  let unset = null;
  let set = payload;
  if (!payload.isCancelled && event.isCancelled) unset = { cancel: '' };

  if (detachFromRepetition) set = { ...set, 'repetition.frequency': NEVER };

  if (!payload.auxiliary) unset = { ...unset, auxiliary: '' };
  else unset = { ...unset, sector: '' };

  if (payload.address && !payload.address.fullAddress) {
    delete set.address;
    unset = { ...unset, address: '' };
  }

  return unset ? { $set: set, $unset: unset } : { $set: set };
};

exports.shouldDetachFromRepetition = (event, payload) => {
  const keys = ['isCancelled', 'internalHour.name', 'address.fullAddress'];
  const mainEventInfo = {
    ...pick(event, keys),
    ...(event.startDate && { startDate: CompaniDate(event.startDate).toISO() }),
    ...(event.endDate && { endDate: CompaniDate(event.endDate).toISO() }),
    ...(event.auxiliary && { auxiliary: new ObjectId(event.auxiliary).toHexString() }),
    ...(event.sector && { sector: new ObjectId(event.sector).toHexString() }),
    ...(event.subscription && { subscription: new ObjectId(event.subscription).toHexString() }),
  };

  const mainPayloadInfo = {
    ...pick(payload, keys),
    ...(payload.startDate && { startDate: CompaniDate(payload.startDate).toISO() }),
    ...(payload.endDate && { endDate: CompaniDate(payload.endDate).toISO() }),
    ...(payload.auxiliary && { auxiliary: new ObjectId(payload.auxiliary).toHexString() }),
    ...(payload.sector && { sector: new ObjectId(payload.sector).toHexString() }),
    ...(payload.subscription && { subscription: new ObjectId(payload.subscription).toHexString() }),
    ...(!payload.isCancelled && { isCancelled: false }),
  };

  return !isEqual(mainEventInfo, mainPayloadInfo);
};

exports.deleteEvent = async (eventId, credentials) => {
  const companyId = get(credentials, 'company._id', null);

  await exports.deleteEventsAndRepetition({ _id: eventId, company: companyId }, false, credentials);
};

exports.createEventHistoryOnDeleteList = async (events, credentials) => {
  const promises = [];
  for (const event of events) {
    const deletionInfo = omit(event, 'repetition');
    promises.push(EventHistoriesHelper.createEventHistoryOnDelete(deletionInfo, credentials));
  }
  await Promise.all(promises);
};

exports.deleteEventsAndRepetition = async (query, shouldDeleteRepetitions, credentials) => {
  const events = await Event.find(query, EventHistoriesHelper.PROJECTION_FIELDS).lean();

  await EventsValidationHelper.checkDeletionIsAllowed(events);

  if (!shouldDeleteRepetitions) {
    await exports.createEventHistoryOnDeleteList(events, credentials);
  } else {
    const eventsGroupedByParentId = groupBy(events, el => get(el, 'repetition.parentId') || '');
    for (const groupId of Object.keys(eventsGroupedByParentId)) {
      if (!groupId) await exports.createEventHistoryOnDeleteList(eventsGroupedByParentId[groupId], credentials);
      else {
        const firstEvent = UtilsHelper.getFirstVersion(eventsGroupedByParentId[groupId], 'startDate');
        await EventHistoriesHelper.createEventHistoryOnDelete(firstEvent, credentials);
        await Repetition.deleteOne({ parentId: groupId });
      }
    }
  }

  await Event.deleteMany({ _id: { $in: events.map(ev => ev._id) } });
};

exports.getContractWeekInfo = (contract, query, shouldPayHolidays) => {
  const start = moment(query.startDate).startOf('w').toDate();
  const end = moment(query.startDate).endOf('w').toDate();
  const weekRatio = UtilsHelper.getDaysRatioBetweenTwoDates(start, end, shouldPayHolidays);
  const versions = ContractHelper.getMatchingVersionsList(contract.versions || [], query);

  return ContractHelper.getContractInfo(versions, query, weekRatio, shouldPayHolidays);
};

exports.getContract = (contracts, startDate, endDate) => contracts.find((cont) => {
  const contractStarted = moment(cont.startDate).isSameOrBefore(endDate);
  if (!contractStarted) return false;

  return !cont.endDate || moment(cont.endDate).isSameOrAfter(startDate);
});

exports.workingStats = async (query, credentials) => {
  const companyId = get(credentials, 'company._id');
  const shouldPayHolidays = get(credentials, 'company.rhConfig.shouldPayHolidays');
  let auxiliaryIds = [];

  if (query.auxiliary) {
    auxiliaryIds = UtilsHelper.formatObjectIdsArray(query.auxiliary);
  } else {
    const users = await UserCompany.find({ company: companyId }, { user: 1 }).lean();
    auxiliaryIds = users.map(u => u.user);
  }

  const auxiliaries = await User.find({ _id: { $in: auxiliaryIds } }).populate('contracts').lean();
  const { startDate, endDate } = query;
  const distanceMatrix = await DistanceMatrix.find({ company: companyId }).lean();
  const auxiliariesIds = auxiliaries.map(aux => aux._id);
  const eventsByAuxiliary = await EventRepository.getEventsToPay(startDate, endDate, auxiliariesIds, companyId);
  const subscriptions = await DraftPayHelper.getSubscriptionsForPay(companyId);

  const workingStats = {};
  for (const auxiliary of auxiliaries) {
    const eventsToPay = eventsByAuxiliary
      .find(g => UtilsHelper.areObjectIdsEquals(g.auxiliary._id, auxiliary._id)) || { absences: [], events: [] };
    const { contracts } = auxiliary;
    if (!contracts || !contracts.length) continue;
    const contract = exports.getContract(contracts, query.startDate, query.endDate);
    if (!contract) continue;

    const contractInfo = exports.getContractWeekInfo(contract, query, shouldPayHolidays);
    const hours =
      await DraftPayHelper.getPayFromEvents(eventsToPay.events, auxiliary, subscriptions, distanceMatrix, [], query);
    const absencesHours = DraftPayHelper.getPayFromAbsences(eventsToPay.absences, contract, query);
    const hoursToWork = Math.max(contractInfo.contractHours - contractInfo.holidaysHours - absencesHours, 0);
    workingStats[auxiliary._id] = { workedHours: hours.workedHours, hoursToWork };
  }

  return workingStats;
};
