const Boom = require('@hapi/boom');
const moment = require('moment');
const pick = require('lodash/pick');
const get = require('lodash/get');
const has = require('lodash/has');
const omit = require('lodash/omit');
const isEqual = require('lodash/isEqual');
const groupBy = require('lodash/groupBy');
const cloneDeep = require('lodash/cloneDeep');
const momentRange = require('moment-range');
const { ObjectId } = require('mongodb');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  ABSENCE,
  UNAVAILABILITY,
  PLANNING_VIEW_END_HOUR,
  AUXILIARY,
  CUSTOMER,
} = require('./constants');
const translate = require('./translate');
const UtilsHelper = require('./utils');
const CustomerAbsencesHelper = require('./customerAbsences');
const EventHistoriesHelper = require('./eventHistories');
const EventsValidationHelper = require('./eventsValidation');
const EventsRepetitionHelper = require('./eventsRepetition');
const DraftPayHelper = require('./draftPay');
const ContractHelper = require('./contracts');
const RepetitionsHelper = require('./repetitions');
const Event = require('../models/Event');
const Repetition = require('../models/Repetition');
const User = require('../models/User');
const DistanceMatrix = require('../models/DistanceMatrix');
const EventRepository = require('../repositories/EventRepository');
const UserCompany = require('../models/UserCompany');
const { CompaniDate } = require('./dates/companiDates');

momentRange.extendMoment(moment);

const { language } = translate;

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

exports.createEvent = async (payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  let eventPayload = { ...cloneDeep(payload), company: companyId };
  if (!await EventsValidationHelper.isCreationAllowed(eventPayload, credentials)) throw Boom.badData();

  const isRepeatedEvent = exports.isRepetition(eventPayload);
  const hasConflicts = await EventsValidationHelper.hasConflicts(eventPayload);
  if (eventPayload.type === INTERVENTION && eventPayload.auxiliary && isRepeatedEvent && hasConflicts) {
    eventPayload = await exports.detachAuxiliaryFromEvent(eventPayload, companyId);
  }

  const event = (await Event.create(eventPayload)).toObject();
  const populatedEvent = await EventRepository.getEvent(event._id, credentials);

  if (!isRepeatedEvent) await EventHistoriesHelper.createEventHistoryOnCreate(event, credentials);
  else {
    await EventsRepetitionHelper.createRepetitions(populatedEvent, payload, credentials);

    const eventHistoryPayload = {
      ...RepetitionsHelper.formatPayloadForRepetitionCreation(populatedEvent, payload, companyId),
      _id: event._id,
    };
    await EventHistoriesHelper.createEventHistoryOnCreate(eventHistoryPayload, credentials);
  }

  if (payload.type === ABSENCE) {
    const { startDate, endDate } = populatedEvent;
    const dates = { startDate, endDate };
    const auxiliary = await User.findOne({ _id: populatedEvent.auxiliary._id })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });
    await exports.deleteConflictInternalHoursAndUnavailabilities(populatedEvent, auxiliary, credentials);
    await exports.unassignConflictInterventions(dates, auxiliary, credentials);
  }

  return exports.populateEventSubscription(populatedEvent);
};

exports.deleteConflictInternalHoursAndUnavailabilities = async (event, auxiliary, credentials) => {
  const types = [INTERNAL_HOUR, UNAVAILABILITY];
  const dates = { startDate: event.startDate, endDate: event.endDate };
  const companyId = get(credentials, 'company._id', null);
  const query = await EventRepository.formatEventsInConflictQuery(dates, auxiliary._id, types, companyId, event._id);

  await exports.deleteEventsAndRepetition(query, false, credentials);
};

exports.unassignConflictInterventions = async (dates, auxiliary, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = await EventRepository.formatEventsInConflictQuery(dates, auxiliary._id, [INTERVENTION], companyId);
  const interventions = await Event.find(query).lean();

  for (let i = 0, l = interventions.length; i < l; i++) {
    const payload = { ...omit(interventions[i], ['_id', 'auxiliary', 'repetition']), sector: auxiliary.sector };
    await exports.updateEvent(interventions[i], payload, credentials);
  }
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

const getEventSector = async (event, companyId) => {
  if (event.sector) return event.sector;

  const user = await User.findOne({ _id: event.auxiliary }, { _id: 1 })
    .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
    .lean();
  return user.sector;
};

/**
 * 1. If the event is in a repetition and we update it without updating the repetition, we should remove it from the
 * repetition i.e. delete the repetition object. EXCEPT if we are only updating the misc field
 *
 * 2. if the event is cancelled and the payload doesn't contain any cancellation info, it means we should remove the
 * cancellation i.e. delete the cancel object and set isCancelled to false.
 */
exports.updateEvent = async (event, eventPayload, credentials) => {
  const companyId = get(credentials, 'company._id');
  if (event.type !== ABSENCE && !CompaniDate(eventPayload.startDate).isSame(eventPayload.endDate, 'day')) {
    throw Boom.badRequest(translate[language].eventDatesNotOnSameDay);
  }

  if (eventPayload.shouldUpdateRepetition) {
    if (!EventsRepetitionHelper.isRepetitionValid(event.repetition)) {
      throw Boom.badData(translate[language].invalidRepetition);
    }

    const isUpdateAllowed = await EventsValidationHelper.isUpdateAllowed(event, eventPayload);
    if (!isUpdateAllowed) throw Boom.badData();

    await EventHistoriesHelper.createEventHistoryOnUpdate(eventPayload, event, credentials);

    const sectorId = await getEventSector(event, companyId);
    await EventsRepetitionHelper.updateRepetition(event, eventPayload, credentials, sectorId);

    await EventsRepetitionHelper.updateEventBelongingToRepetition(eventPayload, event, companyId, sectorId);
  } else {
    const detachFromRepetition = exports.isRepetition(event) && exports.shouldDetachFromRepetition(event, eventPayload);
    const payload = exports.formatEditionPayload(event, eventPayload, detachFromRepetition);

    const isUpdateAllowed = await EventsValidationHelper.isUpdateAllowed(event, payload.$set);
    if (!isUpdateAllowed) throw Boom.badData();

    await EventHistoriesHelper.createEventHistoryOnUpdate(payload.$set, event, credentials);
    await Event.updateOne({ _id: event._id }, payload);
  }

  const updatedEvent = await Event.findOne({ _id: event._id })
    .populate({
      path: 'auxiliary',
      select: 'identity administrative.driveFolder administrative.transportInvoice company picture',
      populate: { path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id') } },
    })
    .populate({ path: 'customer', select: 'identity subscriptions contact' })
    .populate({ path: 'internalHour', match: { company: get(credentials, 'company._id') } })
    .lean();

  if (updatedEvent.type === ABSENCE) {
    const dates = { startDate: updatedEvent.startDate, endDate: updatedEvent.endDate };
    await exports.deleteConflictInternalHoursAndUnavailabilities(updatedEvent, updatedEvent.auxiliary, credentials);
    await exports.unassignConflictInterventions(dates, updatedEvent.auxiliary, credentials);
  }

  return exports.populateEventSubscription(updatedEvent);
};

exports.removeRepetitionsOnContractEndOrDeletion = async (contract) => {
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

exports.deleteCustomerEvents = async (customer, startDate, endDate, absenceType, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = {
    customer: new ObjectId(customer),
    startDate: { $gte: moment(startDate).toDate() },
    company: companyId,
  };

  if (endDate) query.startDate.$lte = endDate;

  await exports.deleteEventsAndRepetition(query, !endDate, credentials);

  if (absenceType) {
    const queryCustomerAbsence = { customer, startDate, endDate, absenceType };
    await CustomerAbsencesHelper.create(queryCustomerAbsence, companyId);
  }
};

exports.updateAbsencesOnContractEnd = async (auxiliaryId, contractEndDate, credentials) => {
  const maxEndDate = CompaniDate(contractEndDate).set({ hour: PLANNING_VIEW_END_HOUR }).startOf('hour').toISO();
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
