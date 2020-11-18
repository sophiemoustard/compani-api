const Boom = require('@hapi/boom');
const moment = require('moment');
const pick = require('lodash/pick');
const get = require('lodash/get');
const omit = require('lodash/omit');
const isEqual = require('lodash/isEqual');
const cloneDeep = require('lodash/cloneDeep');
const momentRange = require('moment-range');
const { ObjectID } = require('mongodb');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  ABSENCE,
  UNAVAILABILITY,
  PLANNING_VIEW_END_HOUR,
  EVERY_WEEK,
  DAILY,
} = require('./constants');
const translate = require('./translate');
const EventHistoriesHelper = require('./eventHistories');
const EventsValidationHelper = require('./eventsValidation');
const EventsRepetitionHelper = require('./eventsRepetition');
const DistanceMatrixHelper = require('./distanceMatrix');
const DraftPayHelper = require('./draftPay');
const ContractHelper = require('./contracts');
const UtilsHelper = require('./utils');
const Event = require('../models/Event');
const Repetition = require('../models/Repetition');
const User = require('../models/User');
const DistanceMatrix = require('../models/DistanceMatrix');
const EventRepository = require('../repositories/EventRepository');
const { AUXILIARY, CUSTOMER } = require('./constants');

momentRange.extendMoment(moment);

const { language } = translate;

const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

exports.list = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const eventsQuery = exports.getListQuery(query, credentials);
  const { groupBy } = query;

  if (groupBy === CUSTOMER) {
    return EventRepository.getEventsGroupedByCustomers(eventsQuery, get(credentials, 'company._id', null));
  } if (groupBy === AUXILIARY) {
    return EventRepository.getEventsGroupedByAuxiliaries(eventsQuery, get(credentials, 'company._id', null));
  }
  return exports.populateEvents(await EventRepository.getEventList(eventsQuery, companyId));
};

exports.createEvent = async (payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  let event = { ...cloneDeep(payload), company: companyId };
  if (!await EventsValidationHelper.isCreationAllowed(event, credentials)) throw Boom.badData();

  await EventHistoriesHelper.createEventHistoryOnCreate(payload, credentials);

  const isRepeatedEvent = isRepetition(event);
  const hasConflicts = await EventsValidationHelper.hasConflicts(event);
  if (event.type === INTERVENTION && event.auxiliary && isRepeatedEvent && hasConflicts) {
    const auxiliary = await User.findOne({ _id: event.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id', null) } })
      .lean({ autopopulate: true, virtuals: true });
    delete event.auxiliary;
    event.sector = auxiliary.sector;
    event.repetition.frequency = NEVER;
  }

  event = await Event.create(event);
  event = await EventRepository.getEvent(event._id, credentials);
  if (payload.type === ABSENCE) {
    const { startDate, endDate } = event;
    const dates = { startDate, endDate };
    const auxiliary = await User.findOne({ _id: event.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id', null) } })
      .lean({ autopopulate: true, virtuals: true });
    await exports.deleteConflictInternalHoursAndUnavailabilities(event, auxiliary, credentials);
    await exports.unassignConflictInterventions(dates, auxiliary, credentials);
  }

  if (isRepeatedEvent) {
    await EventsRepetitionHelper.createRepetitions(
      event,
      { ...payload, company: companyId, repetition: { ...payload.repetition, parentId: event._id } },
      credentials
    );
  }

  return exports.populateEventSubscription(event);
};

exports.deleteConflictInternalHoursAndUnavailabilities = async (event, auxiliary, credentials) => {
  const types = [INTERNAL_HOUR, UNAVAILABILITY];
  const dates = { startDate: event.startDate, endDate: event.endDate };
  const companyId = get(credentials, 'company._id', null);
  const events = await EventRepository.getEventsInConflicts(dates, auxiliary._id, types, companyId, event._id);

  await exports.deleteEvents(events, credentials);
};

exports.unassignConflictInterventions = async (dates, auxiliary, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const interventions = await EventRepository.getEventsInConflicts(dates, auxiliary._id, [INTERVENTION], companyId);

  for (let i = 0, l = interventions.length; i < l; i++) {
    const payload = {
      ...omit(interventions[i], ['_id', 'auxiliary', 'repetition']),
      sector: auxiliary.sector,
    };
    await exports.updateEvent(interventions[i], payload, credentials);
  }
};

exports.getListQuery = (query, credentials) => {
  const rules = [{ company: new ObjectID(get(credentials, 'company._id', null)) }];

  const { auxiliary, type, customer, sector, isBilled, startDate, endDate } = query;
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
  if (isBilled) rules.push({ customer: isBilled });
  if (startDate) {
    const startDateQuery = moment(startDate).startOf('d').toDate();
    rules.push({ endDate: { $gt: startDateQuery } });
  }
  if (endDate) {
    const endDateQuery = moment(endDate).endOf('d').toDate();
    rules.push({ startDate: { $lt: endDateQuery } });
  }

  return { $and: rules };
};

exports.listForCreditNotes = (payload, credentials) => {
  let query = {
    startDate: { $gte: moment(payload.startDate).startOf('d').toDate() },
    endDate: { $lte: moment(payload.endDate).endOf('d').toDate() },
    customer: payload.customer,
    isBilled: payload.isBilled,
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
  return Event.find(query).lean();
};

exports.populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions
    .find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.badImplementation();

  return { ...event, subscription };
};

exports.populateEvents = async (events) => {
  const populatedEvents = [];
  for (let i = 0; i < events.length; i++) {
    const event = await exports.populateEventSubscription(events[i]);
    populatedEvents.push(event);
  }

  return populatedEvents;
};

exports.updateEventsInternalHourType = async (eventsStartDate, oldInternalHourId, internalHourId) => Event.updateMany(
  { type: INTERNAL_HOUR, internalHour: oldInternalHourId, startDate: { $gte: eventsStartDate } },
  { $set: { internalHour: internalHourId } }
);

exports.isMiscOnlyUpdated = (event, payload) => {
  const mainEventInfo = pick(
    event,
    ['isCancelled', 'startDate', 'endDate', 'internalHour.name', 'address.fullAddress']
  );
  if (event.auxiliary) mainEventInfo.auxiliary = event.auxiliary.toHexString();
  if (event.sector) mainEventInfo.sector = event.sector.toHexString();
  if (event.subscription) mainEventInfo.subscription = event.subscription.toHexString();

  const mainPayloadInfo = pick(
    payload,
    ['isCancelled', 'startDate', 'endDate', 'sector', 'auxiliary',
      'subscription', 'internalHour.name', 'address.fullAddress']
  );
  if (!mainPayloadInfo.isCancelled) mainPayloadInfo.isCancelled = false;

  return (payload.misc !== event.misc && isEqual(mainEventInfo, mainPayloadInfo));
};

exports.formatEditionPayload = (event, payload) => {
  const miscUpdatedOnly = payload.misc && exports.isMiscOnlyUpdated(event, payload);
  let unset = null;
  let set = payload;
  if (!payload.isCancelled && event.isCancelled) {
    unset = { cancel: '' };
  }

  if (isRepetition(event) && !miscUpdatedOnly) set = { ...set, 'repetition.frequency': NEVER };

  if (!payload.auxiliary) unset = { ...unset, auxiliary: '' };
  else unset = { ...unset, sector: '' };

  if (payload.address && !payload.address.fullAddress) {
    delete set.address;
    unset = { ...unset, address: '' };
  }

  return unset ? { $set: set, $unset: unset } : { $set: set };
};

/**
 * 1. If the event is in a repetition and we update it without updating the repetition, we should remove it from the
 * repetition i.e. delete the repetition object. EXCEPT if we are only updating the misc field
 *
 * 2. if the event is cancelled and the payload doesn't contain any cancellation info, it means we should remove the
 * cancellation i.e. delete the cancel object and set isCancelled to false.
 */
exports.updateEvent = async (event, eventPayload, credentials) => {
  if (event.type !== ABSENCE && !moment(eventPayload.startDate).isSame(eventPayload.endDate, 'day')) {
    throw Boom.badRequest(translate[language].eventDatesNotOnSameDay);
  }
  if (!(await EventsValidationHelper.isUpdateAllowed(event, eventPayload, credentials))) throw Boom.badData();

  const companyId = get(credentials, 'company._id', null);
  await EventHistoriesHelper.createEventHistoryOnUpdate(eventPayload, event, credentials);

  if (eventPayload.shouldUpdateRepetition) {
    await EventsRepetitionHelper.updateRepetition(event, eventPayload, credentials);
  } else {
    const payload = exports.formatEditionPayload(event, eventPayload);
    await Event.updateOne({ _id: event._id }, { ...payload });
  }

  const updatedEvent = await Event.findOne({ _id: event._id })
    .populate({
      path: 'auxiliary',
      select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
      populate: { path: 'sector', select: '_id sector', match: { company: companyId } },
    })
    .populate({ path: 'customer', select: 'identity subscriptions contact' })
    .populate({ path: 'internalHour', match: { company: get(credentials, 'company._id', null) } })
    .lean();

  if (updatedEvent.type === ABSENCE) {
    const dates = { startDate: updatedEvent.startDate, endDate: updatedEvent.endDate };
    await exports.deleteConflictInternalHoursAndUnavailabilities(updatedEvent, updatedEvent.auxiliary, credentials);
    await exports.unassignConflictInterventions(dates, updatedEvent.auxiliary, credentials);
  }

  return exports.populateEventSubscription(updatedEvent);
};

exports.removeRepetitionsOnContractEnd = async (contract) => {
  const { sector, _id: auxiliaryId } = contract.user;

  await Repetition.updateMany(
    { auxiliary: auxiliaryId, type: INTERVENTION },
    { $unset: { auxiliary: '' }, $set: { sector } }
  );
  await Repetition.deleteMany({ auxiliary: auxiliaryId, type: { $in: [UNAVAILABILITY, INTERNAL_HOUR] } });
};

exports.unassignInterventionsOnContractEnd = async (contract, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const { sector, _id: auxiliaryId } = contract.user;

  const interventionsToUnassign = await EventRepository.getInterventionsToUnassign(
    contract.endDate,
    auxiliaryId,
    companyId
  );
  const promises = [];
  const ids = [];
  for (const group of interventionsToUnassign) {
    if (group._id) {
      const { startDate, endDate, misc } = group.events[0];
      const payload = { startDate, endDate, misc, shouldUpdateRepetition: true };
      promises.push(EventHistoriesHelper.createEventHistoryOnUpdate(payload, group.events[0], credentials));
      ids.push(...group.events.map(ev => ev._id));
    } else {
      for (const intervention of group.events) {
        const { startDate, endDate, misc } = intervention;
        const payload = { startDate, endDate, misc };
        promises.push(EventHistoriesHelper.createEventHistoryOnUpdate(payload, intervention, credentials));
        ids.push(intervention._id);
      }
    }
  }

  await Event.updateMany(
    { _id: { $in: ids } },
    { $set: { 'repetition.frequency': NEVER, sector }, $unset: { auxiliary: '' } }
  );
};

exports.removeEventsExceptInterventionsOnContractEnd = async (contract, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const events = await EventRepository.getEventsExceptInterventions(contract.endDate, contract.user._id, companyId);
  const promises = [];
  const ids = [];

  for (const group of events) {
    if (group._id) {
      promises.push(EventHistoriesHelper.createEventHistoryOnDelete(group.events[0], credentials));
      ids.push(...group.events.map(ev => ev._id));
    } else {
      for (const intervention of group.events) {
        promises.push(EventHistoriesHelper.createEventHistoryOnDelete(intervention, credentials));
        ids.push(intervention._id);
      }
    }
  }

  promises.push(Event.deleteMany({ _id: { $in: ids } }));

  return Promise.all(promises);
};

exports.deleteList = async (customer, startDate, endDate, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = {
    customer: new ObjectID(customer),
    startDate: { $gte: moment(startDate).toDate() },
  };
  if (endDate) query.startDate.$lte = moment(endDate).endOf('d').toDate();
  const billedEventsCount = await Event.countDocuments({ ...query, company: new ObjectID(companyId), isBilled: true });
  if (billedEventsCount > 0) throw Boom.conflict('Some events are already billed');

  const eventsGroupedByParentId = await EventRepository.getEventsGroupedByParentId(query, companyId);
  for (const group of eventsGroupedByParentId) {
    if (!group._id || endDate) await exports.deleteEvents(group.events, credentials);
    else {
      const event = { ...group.events[0], repetition: { frequency: EVERY_WEEK, parentId: group._id } };
      await EventsRepetitionHelper.deleteRepetition(event, credentials);
    }
  }
};

exports.updateAbsencesOnContractEnd = async (auxiliaryId, contractEndDate, credentials) => {
  const maxEndDate = moment(contractEndDate).hour(PLANNING_VIEW_END_HOUR).startOf('h');
  const absences = await EventRepository.getAbsences(auxiliaryId, maxEndDate, get(credentials, 'company._id', null));
  const absencesIds = absences.map(abs => abs._id);
  const promises = [];

  for (const absence of absences) {
    const { startDate, misc } = absence;
    const payload = { startDate, endDate: maxEndDate, misc, auxiliary: auxiliaryId.toHexString() };
    promises.push(EventHistoriesHelper.createEventHistoryOnUpdate(payload, absence, credentials));
  }

  promises.push(Event.updateMany({ _id: { $in: absencesIds } }, { $set: { endDate: maxEndDate } }));

  return Promise.all(promises);
};

exports.deleteEvent = async (event, credentials) => {
  if (!EventsValidationHelper.isDeletionAllowed(event)) throw Boom.conflict('The event is already billed');
  const deletionInfo = omit(event, 'repetition');
  await EventHistoriesHelper.createEventHistoryOnDelete(deletionInfo, credentials);
  await Event.deleteOne({ _id: event._id });

  return event;
};

exports.deleteEvents = async (events, credentials) => {
  const promises = [];
  if (events.some(event => !EventsValidationHelper.isDeletionAllowed(event))) {
    throw Boom.conflict('Some events are already billed');
  }

  for (const event of events) {
    const deletionInfo = omit(event, 'repetition');
    promises.push(EventHistoriesHelper.createEventHistoryOnDelete(deletionInfo, credentials));
  }

  await Promise.all(promises);
  await Event.deleteMany({ _id: { $in: events.map(ev => ev._id) } });
};

exports.getContractWeekInfo = (contract, query) => {
  const start = moment(query.startDate).startOf('w').toDate();
  const end = moment(query.startDate).endOf('w').toDate();
  const weekRatio = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);
  const versions = ContractHelper.getMatchingVersionsList(contract.versions || [], query);

  return ContractHelper.getContractInfo(versions, query, weekRatio);
};

exports.getContract = (contracts, startDate, endDate) => contracts.find((cont) => {
  const contractStarted = moment(cont.startDate).isSameOrBefore(endDate);
  if (!contractStarted) return false;

  return !cont.endDate || moment(cont.endDate).isSameOrAfter(startDate);
});

exports.workingStats = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const queryAuxiliaries = { company: companyId };
  if (query.auxiliary) {
    const ids = UtilsHelper.formatObjectIdsArray(query.auxiliary);
    queryAuxiliaries._id = { $in: ids };
  }
  const auxiliaries = await User.find(queryAuxiliaries).populate('contracts').lean();
  const { startDate, endDate } = query;
  const distanceMatrix = await DistanceMatrix.find({ company: companyId }).lean();
  const auxiliariesIds = auxiliaries.map(aux => aux._id);
  const eventsByAuxiliary = await EventRepository.getEventsToPay(startDate, endDate, auxiliariesIds, companyId);

  const workingStats = {};
  for (const auxiliary of auxiliaries) {
    const eventsToPay = eventsByAuxiliary
      .find(g => g.auxiliary._id.toHexString() === auxiliary._id.toHexString()) || { absences: [], events: [] };
    const { contracts } = auxiliary;
    if (!contracts || !contracts.length) continue;
    const contract = exports.getContract(contracts, query.startDate, query.endDate);
    if (!contract) continue;

    const contractInfo = exports.getContractWeekInfo(contract, query);
    const hours = await DraftPayHelper.getPayFromEvents(eventsToPay.events, auxiliary, distanceMatrix, [], query);
    const absencesHours = DraftPayHelper.getPayFromAbsences(eventsToPay.absences, contract, query);
    const hoursToWork = Math.max(contractInfo.contractHours - contractInfo.holidaysHours - absencesHours, 0);
    workingStats[auxiliary._id] = { workedHours: hours.workedHours, hoursToWork };
  }

  return workingStats;
};

exports.getPaidTransportStatsBySector = async (query, credentials) => {
  const companyId = get(credentials, 'company._id') || null;
  const sectors = UtilsHelper.formatObjectIdsArray(query.sector);

  const [distanceMatrix, paidTransportStatsBySector] = await Promise.all([
    DistanceMatrixHelper.getDistanceMatrices(credentials),
    EventRepository.getPaidTransportStatsBySector(sectors, query.month, companyId),
  ]);

  const result = [];
  for (const sector of paidTransportStatsBySector) {
    const promises = [];
    for (const auxiliary of sector.auxiliaries) {
      for (const day of auxiliary.days) {
        if (day.events.length > 1) {
          for (let i = 1; i < day.events.length; i++) {
            promises.push(DraftPayHelper.getPaidTransportInfo(day.events[i], day.events[i - 1], distanceMatrix));
          }
        }
      }
    }
    const transports = await Promise.all(promises);
    result.push({ sector: sector._id, duration: transports.reduce((acc, t) => acc + t.duration, 0) / 60 });
  }

  return result;
};

exports.getUnassignedHoursBySector = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const sectors = UtilsHelper.formatObjectIdsArray(query.sector);

  return EventRepository.getUnassignedHoursBySector(sectors, query.month, companyId);
};

exports.getAbsenceHours = (absence, contracts) => {
  const filteredContracts = contracts
    .filter(c => moment(c.startDate).isSameOrBefore(absence.endDate) &&
      (!c.endDate || moment(c.endDate).isAfter(absence.startDate)))
    .sort((a, b) => moment(a.startDate).isSameOrBefore(b.startDate));

  return absence.absenceNature === DAILY
    ? filteredContracts.reduce((acc, c) => acc + DraftPayHelper.getHoursFromDailyAbsence(absence, c), 0)
    : moment(absence.endDate).diff(absence.startDate, 'm') / 60;
};
