const Boom = require('boom');
const moment = require('moment');
const _ = require('lodash');
const momentRange = require('moment-range');
const { ObjectID } = require('mongodb');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  COMPANY_CONTRACT,
  ABSENCE,
  UNAVAILABILITY,
  PLANNING_VIEW_END_HOUR,
  EVERY_WEEK,
} = require('./constants');
const EventHistoriesHelper = require('./eventHistories');
const EventsValidationHelper = require('./eventsValidation');
const EventsRepetitionHelper = require('./eventsRepetition');
const DraftPayHelper = require('./draftPay');
const ContractHelper = require('./contracts');
const UtilsHelper = require('./utils');
const Event = require('../models/Event');
const Repetition = require('../models/Repetition');
const User = require('../models/User');
const DistanceMatrix = require('../models/DistanceMatrix');
const EventRepository = require('../repositories/EventRepository');

momentRange.extendMoment(moment);

const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

exports.createEvent = async (payload, credentials) => {
  const companyId = _.get(credentials, 'company._id', null);
  let event = { ...payload, company: companyId };
  if (!(await EventsValidationHelper.isCreationAllowed(event))) throw Boom.badData();

  await EventHistoriesHelper.createEventHistoryOnCreate(payload, credentials);

  const isRepeatedEvent = isRepetition(event);
  if (event.type === INTERVENTION && event.auxiliary && isRepeatedEvent && await EventsValidationHelper.hasConflicts(event)) {
    delete event.auxiliary;
    event.repetition.frequency = NEVER;
  }

  event = await Event.create(event);
  event = await EventRepository.getEvent(event._id, credentials);
  if (payload.type === ABSENCE) {
    const { startDate, endDate, auxiliary, _id } = event;
    const dates = { startDate, endDate };
    await exports.deleteConflictInternalHoursAndUnavailabilities(dates, auxiliary._id.toHexString(), _id.toHexString(), credentials);
    await exports.unassignConflictInterventions(dates, auxiliary._id.toHexString(), credentials);
  }

  if (isRepeatedEvent) await EventsRepetitionHelper.createRepetitions(event, { ...payload, company: companyId });

  return exports.populateEventSubscription(event);
};

exports.deleteConflictInternalHoursAndUnavailabilities = async (dates, auxiliary, eventId, credentials) => {
  const types = [INTERNAL_HOUR, UNAVAILABILITY];
  const events = await EventRepository.getEventsInConflicts(dates, auxiliary, types, _.get(credentials, 'company._id', null), eventId);

  await exports.deleteEvents(events, credentials);
};

exports.unassignConflictInterventions = async (dates, auxiliary, credentials) => {
  const interventions = await EventRepository.getEventsInConflicts(dates, auxiliary, [INTERVENTION], _.get(credentials, 'company._id', null));

  for (let i = 0, l = interventions.length; i < l; i++) {
    const payload = _.omit(interventions[i], ['_id', 'auxiliary', 'repetition']);
    await exports.updateEvent(interventions[i], payload, credentials);
  }
};

exports.getListQuery = (query, credentials) => {
  const rules = [{ company: new ObjectID(_.get(credentials, 'company._id')) }];

  const { auxiliary, type, customer, sector, isBilled, startDate, endDate, status } = query;

  if (type) rules.push({ type });
  if (status) rules.push({ status });

  const sectorOrAuxiliary = [];
  if (auxiliary) {
    const auxiliaryCondition = Array.isArray(auxiliary) ? auxiliary.map(id => new ObjectID(id)) : [new ObjectID(auxiliary)];
    sectorOrAuxiliary.push({ auxiliary: { $in: auxiliaryCondition } });
  }
  if (sector) {
    const sectorCondition = Array.isArray(sector) ? sector.map(id => new ObjectID(id)) : [new ObjectID(sector)];
    sectorOrAuxiliary.push({ sector: { $in: sectorCondition } });
  }
  if (sectorOrAuxiliary.length > 0) rules.push({ $or: sectorOrAuxiliary });

  if (customer) {
    const customerCondition = Array.isArray(customer) ? customer.map(id => new ObjectID(id)) : [new ObjectID(customer)];
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
    company: _.get(credentials, 'company._id', null),
  };
  if (payload.thirdPartyPayer) query = { ...query, 'bills.thirdPartyPayer': payload.thirdPartyPayer };
  else query = { ...query, 'bills.inclTaxesCustomer': { $exists: true, $gt: 0 }, 'bills.inclTaxesTpp': { $exists: false } };
  return Event.find(query).lean();
};

exports.populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions.find(sub => sub._id.toHexString() === event.subscription.toHexString());
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
  {
    type: INTERNAL_HOUR,
    internalHour: oldInternalHourId,
    startDate: { $gte: eventsStartDate },
  },
  { $set: { internalHour: internalHourId } }
);

exports.isMiscOnlyUpdated = (event, payload) => {
  const mainEventInfo = {
    ..._.pick(event, ['isCancelled', 'startDate', 'endDate', 'status', 'internalHour.name', 'address.fullAddress']),
    sector: event.sector.toHexString(),
  };
  if (event.auxiliary) mainEventInfo.auxiliary = event.auxiliary.toHexString();
  if (event.subscription) mainEventInfo.subscription = event.subscription.toHexString();

  const mainPayloadInfo = _.pick(
    payload,
    ['isCancelled', 'startDate', 'endDate', 'status', 'sector', 'auxiliary', 'subscription', 'internalHour.name', 'address.fullAddress']
  );
  if (!mainPayloadInfo.isCancelled) mainPayloadInfo.isCancelled = false;

  return (payload.misc !== event.misc && _.isEqual(mainEventInfo, mainPayloadInfo));
};

/**
 * 1. If the event is in a repetition and we update it without updating the repetition, we should remove it from the repetition
 * i.e. delete the repetition object. EXCEPT if we are only updating the misc field
 *
 * 2. if the event is cancelled and the payload doesn't contain any cancellation info, it means we should remove the camcellation
 * i.e. delete the cancel object and set isCancelled to false.
 */
exports.updateEvent = async (event, eventPayload, credentials) => {
  await EventHistoriesHelper.createEventHistoryOnUpdate(eventPayload, event, credentials);
  if (eventPayload.shouldUpdateRepetition) return EventsRepetitionHelper.updateRepetition(event, eventPayload, credentials);

  const miscUpdatedOnly = eventPayload.misc && exports.isMiscOnlyUpdated(event, eventPayload);
  let unset = null;
  let set = eventPayload;
  if (!eventPayload.isCancelled && event.isCancelled) {
    set = { ...set, isCancelled: false };
    unset = { cancel: '' };
  }
  if (isRepetition(event) && !miscUpdatedOnly) {
    set = { ...set, 'repetition.frequency': NEVER };
  }

  if (!eventPayload.auxiliary) unset = { ...unset, auxiliary: '' };

  event = await EventRepository.updateEvent(event._id, set, unset, credentials);

  if (event.type === ABSENCE) {
    const { startDate, endDate, auxiliary, _id } = event;
    const dates = { startDate, endDate };
    await exports.deleteConflictInternalHoursAndUnavailabilities(dates, auxiliary._id.toHexString(), _id.toHexString(), credentials);
    await exports.unassignConflictInterventions(dates, auxiliary._id.toHexString(), credentials);
  }

  return exports.populateEventSubscription(event);
};

exports.unassignInterventionsOnContractEnd = async (contract, credentials) => {
  const companyId = _.get(credentials, 'company._id', null);
  const customerSubscriptionsFromEvents = await EventRepository.getCustomerSubscriptions(contract, companyId);

  if (customerSubscriptionsFromEvents.length === 0) return;
  let correspondingSubs;
  correspondingSubs = contract.status === COMPANY_CONTRACT
    ? customerSubscriptionsFromEvents.filter(ev => ev.sub.service.type === contract.status)
    : correspondingSubs = customerSubscriptionsFromEvents
      .filter(ev => ev.customer._id === contract.customer && ev.sub.service.type === contract.status);

  const correspondingSubsIds = correspondingSubs.map(sub => sub.sub._id);

  const unassignedInterventions = await EventRepository.getUnassignedInterventions(contract.endDate, contract.user, correspondingSubsIds, companyId);
  const promises = [];
  const ids = [];

  for (const group of unassignedInterventions) {
    if (group._id) {
      const { startDate, endDate, misc } = group.events[0];
      promises.push(EventHistoriesHelper.createEventHistoryOnUpdate({ startDate, endDate, misc, shouldUpdateRepetition: true }, group.events[0], credentials));
      ids.push(...group.events.map(ev => ev._id));
    } else {
      for (const intervention of group.events) {
        const { startDate, endDate, misc } = intervention;
        promises.push(EventHistoriesHelper.createEventHistoryOnUpdate({ startDate, endDate, misc }, intervention, credentials));
        ids.push(intervention._id);
      }
    }
  }

  promises.push(
    Event.updateMany(
      { _id: { $in: ids } },
      { $set: { 'repetition.frequency': NEVER }, $unset: { auxiliary: '' } }
    ),
    Repetition.updateMany({ auxiliary: contract.user, type: 'intervention' }, { $unset: { auxiliary: '' } }),
    Repetition.deleteMany({ auxiliary: contract.user, $or: [{ type: 'unavailability' }, { type: 'internalHour' }] })
  );

  return Promise.all(promises);
};

exports.removeEventsExceptInterventionsOnContractEnd = async (contract, credentials) => {
  const events = await EventRepository.getEventsExceptInterventions(contract.endDate, contract.user, _.get(credentials, 'company._id', null));
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
  const companyId = _.get(credentials, 'company._id', null);
  const query = {
    customer: new ObjectID(customer),
    startDate: { $gte: moment(startDate).toDate() },
  };
  if (endDate) query.startDate.$lte = moment(endDate).endOf('d').toDate();
  if (await Event.countDocuments({
    ...query,
    company: new ObjectID(companyId),
    isBilled: true,
  }) > 0) throw Boom.conflict('Some events are already billed');

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
  const absences = await EventRepository.getAbsences(auxiliaryId, maxEndDate, _.get(credentials, 'company._id', null));
  const absencesIds = absences.map(abs => abs._id);
  const promises = [];

  for (const absence of absences) {
    const { startDate, misc } = absence;
    const payload = { startDate, endDate: maxEndDate, misc };
    promises.push(EventHistoriesHelper.createEventHistoryOnUpdate(payload, absence, credentials));
  }

  promises.push(Event.updateMany({ _id: { $in: absencesIds } }, { $set: { endDate: maxEndDate } }));

  return Promise.all(promises);
};

exports.deleteEvent = async (event, credentials) => {
  if (!EventsValidationHelper.isDeletionAllowed(event)) throw Boom.conflict('The event is already billed');
  const deletionInfo = _.omit(event, 'repetition');
  await EventHistoriesHelper.createEventHistoryOnDelete(deletionInfo, credentials);
  await Event.deleteOne({ _id: event._id });

  return event;
};

exports.deleteEvents = async (events, credentials) => {
  const promises = [];
  if (events.some(event => !EventsValidationHelper.isDeletionAllowed(event))) throw Boom.conflict('Some events are already billed');
  for (const event of events) {
    const deletionInfo = _.omit(event, 'repetition');
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
  const isCompanyContract = cont.status === COMPANY_CONTRACT;
  if (!isCompanyContract) return false;

  const contractStarted = moment(cont.startDate).isSameOrBefore(endDate);
  if (!contractStarted) return false;

  return !cont.endDate || moment(cont.endDate).isSameOrAfter(startDate);
});

exports.workingStats = async (query, credentials) => {
  const ids = Array.isArray(query.auxiliary)
    ? query.auxiliary.map(id => new ObjectID(id))
    : [new ObjectID(query.auxiliary)];
  const auxiliaries = await User.find({ _id: { $in: ids } }).populate('contracts').lean();
  const companyId = _.get(credentials, 'company._id');
  const { startDate, endDate } = query;
  const distanceMatrix = await DistanceMatrix.find({ company: companyId }).lean();
  const auxiliariesIds = auxiliaries.map(aux => aux._id);
  const eventsByAuxiliary = await EventRepository.getEventsToPay(startDate, endDate, auxiliariesIds, companyId);

  const workingStats = {};
  for (const auxiliary of auxiliaries) {
    const eventsToPay =
      eventsByAuxiliary.find(group => group.auxiliary._id.toHexString() === auxiliary._id.toHexString())
      || { absences: [], events: [] };
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
