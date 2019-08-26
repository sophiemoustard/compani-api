const Boom = require('boom');
const moment = require('moment');
const flat = require('flat');
const _ = require('lodash');
const momentRange = require('moment-range');
const { ObjectID } = require('mongodb');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
  EVERY_TWO_WEEKS,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
  ABSENCE,
  UNAVAILABILITY,
  PLANNING_VIEW_END_HOUR,
} = require('./constants');
const Event = require('../models/Event');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Contract = require('../models/Contract');
const { populateSubscriptionsServices } = require('../helpers/subscriptions');
const EventHistoriesHelper = require('./eventHistories');
const EventRepository = require('../repositories/EventRepository');

momentRange.extendMoment(moment);

exports.auxiliaryHasActiveCompanyContractOnDay = (contracts, day) =>
  contracts.some(contract =>
    contract.status === COMPANY_CONTRACT &&
      moment(contract.startDate).isSameOrBefore(day, 'd') &&
      ((!contract.endDate && contract.versions.some(version => version.isActive)) ||
        (contract.endDate && moment(contract.endDate).isSameOrAfter(day, 'd'))));

exports.hasConflicts = async (event) => {
  const { _id, auxiliary, startDate, endDate } = event;
  const auxiliaryEvents = await EventRepository.getAuxiliaryEventsBetweenDates(auxiliary, startDate, endDate);

  return auxiliaryEvents.some((ev) => {
    if ((_id && _id.toHexString() === ev._id.toHexString()) || ev.isCancelled) return false;
    return true;
  });
};

const isRepetition = event => event.repetition && event.repetition.frequency && event.repetition.frequency !== NEVER;

exports.createEvent = async (payload, credentials) => {
  if (!(await exports.isCreationAllowed(payload))) throw Boom.badData();

  await EventHistoriesHelper.createEventHistoryOnCreate(payload, credentials);

  let event = { ...payload };
  const isRepeatedEvent = isRepetition(event);
  if (event.type === INTERVENTION && event.auxiliary && isRepeatedEvent && await exports.hasConflicts(event)) {
    delete event.auxiliary;
    delete event.repetition;
  }

  event = new Event(event);
  await event.save();
  event = await EventRepository.getEvent(event._id);

  if (payload.type === ABSENCE) {
    const { startDate, endDate, auxiliary, _id } = event;
    const dates = { startDate, endDate };
    await exports.deleteConflictEventsExceptInterventions(dates, auxiliary._id.toHexString(), _id.toHexString(), credentials);
    await exports.unassignConflictInterventions(dates, auxiliary._id.toHexString(), credentials);
  }

  if (isRepeatedEvent) await exports.createRepetitions(event, payload);

  return exports.populateEventSubscription(event);
};

exports.deleteConflictEventsExceptInterventions = async (dates, auxiliary, eventId, credentials) => {
  const types = [INTERNAL_HOUR, ABSENCE, UNAVAILABILITY];
  const events = await EventRepository.getEventsInConflicts(dates, auxiliary, types, eventId);

  await exports.deleteEvents(events, credentials);
};

exports.unassignConflictInterventions = async (dates, auxiliary, credentials) => {
  const interventions = await EventRepository.getEventsInConflicts(dates, auxiliary, [INTERVENTION]);

  for (let i = 0, l = interventions.length; i < l; i++) {
    const payload = _.omit(interventions[i], ['_id', 'auxiliary', 'repetition']);
    await exports.updateEvent(interventions[i], payload, credentials);
  }
};

exports.checkContracts = async (event, user) => {
  if (!user.contracts || user.contracts.length === 0) return false;

  // If the event is an intervention :
  // - if it's a customer contract subscription, the auxiliary should have an active contract with the customer on the day of the intervention
  // - else (company contract subscription) the auxiliary should have an active contract on the day of the intervention and this customer
  //   should have an active subscription
  if (event.type === INTERVENTION) {
    let customer = await Customer.findOne({ _id: event.customer }).populate('subscriptions.service').lean();
    customer = await populateSubscriptionsServices(customer);

    const eventSubscription = customer.subscriptions.find(sub => sub._id.toHexString() == event.subscription);
    if (!eventSubscription) return false;

    if (eventSubscription.service.type === CUSTOMER_CONTRACT) {
      const contractBetweenAuxAndCus = await Contract.findOne({ user: event.auxiliary, customer: event.customer });
      if (!contractBetweenAuxAndCus) return false;
      return contractBetweenAuxAndCus.endDate
        ? moment(event.startDate).isBetween(contractBetweenAuxAndCus.startDate, contractBetweenAuxAndCus.endDate, '[]')
        : moment(event.startDate).isSameOrAfter(contractBetweenAuxAndCus.startDate);
    }

    return exports.auxiliaryHasActiveCompanyContractOnDay(user.contracts, event.startDate);
  }

  // If the auxiliary is only under customer contract, create internal hours is not allowed
  if (event.type === INTERNAL_HOUR) {
    return exports.auxiliaryHasActiveCompanyContractOnDay(user.contracts, event.startDate);
  }

  return true;
};

const isOneDayEvent = event => moment(event.startDate).isSame(event.endDate, 'day');
const eventHasAuxiliarySector = (event, user) => event.sector === user.sector.toHexString();
const isAuxiliaryUpdated = (payload, eventFromDB) => payload.auxiliary && payload.auxiliary !== eventFromDB.auxiliary.toHexString();

exports.isCreationAllowed = async (event) => {
  if (event.type !== ABSENCE && !isOneDayEvent(event)) return false;
  if (!event.auxiliary) return event.type === INTERVENTION;

  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!await exports.checkContracts(event, user)) return false;

  if (event.type !== ABSENCE && !(isRepetition(event) && event.type === INTERVENTION) && await exports.hasConflicts(event)) return false;

  if (!eventHasAuxiliarySector(event, user)) return false;

  return true;
};

exports.isEditionAllowed = async (eventFromDB, payload) => {
  if (eventFromDB.type === INTERVENTION && eventFromDB.isBilled) return false;

  if ([ABSENCE, UNAVAILABILITY].includes(eventFromDB.type) && isAuxiliaryUpdated(payload, eventFromDB)) return false;

  const event = !payload.auxiliary
    ? { ..._.omit(eventFromDB, 'auxiliary'), ...payload }
    : { ...eventFromDB, ...payload };

  if (event.type !== ABSENCE && !isOneDayEvent(event)) return false;
  if (!event.auxiliary) return event.type === INTERVENTION;

  const user = await User.findOne({ _id: event.auxiliary }).populate('contracts').lean();
  if (!await exports.checkContracts(event, user)) return false;

  if (!event.isCancelled && (await exports.hasConflicts(event))) return false;

  if (!eventHasAuxiliarySector(event, user)) return false;

  return true;
};

exports.getListQuery = (req) => {
  const rules = [];

  const { auxiliary, type, customer, sector, isBilled, startDate, endDate } = req.query;

  if (type) rules.push({ type });

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
  if (startDate && endDate) {
    const startDateQuery = moment(startDate).startOf('d').toDate();
    const endDateQuery = moment(endDate).endOf('d').toDate();
    rules.push({
      $or: [
        { startDate: { $lte: endDateQuery, $gte: startDateQuery } },
        { endDate: { $lte: endDateQuery, $gte: startDateQuery } },
        { endDate: { $gte: endDateQuery }, startDate: { $lte: startDateQuery } },
      ],
    });
  } else if (startDate && !endDate) {
    const startDateQuery = moment(startDate).startOf('d').toDate();
    rules.push({
      $or: [{ startDate: { $gte: startDateQuery } }, { endDate: { $gte: startDateQuery } }],
    });
  } else if (endDate) {
    const endDateQuery = moment(endDate).endOf('d').toDate();
    rules.push({
      $or: [{ startDate: { $lte: endDateQuery } }, { endDate: { $lte: endDateQuery } }],
    });
  }

  return rules.length > 0 ? { $and: rules } : {};
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

exports.updateEventsInternalHourType = async (oldInternalHourId, newInternalHour) => {
  const payload = { internalHour: newInternalHour };
  await Event.update(
    {
      type: INTERNAL_HOUR,
      'internalHour._id': oldInternalHourId,
      startDate: { $gte: moment().toDate() },
    },
    { $set: payload },
    { multi: true }
  );
};

exports.formatRepeatedPayload = async (event, momentDay) => {
  const step = momentDay.diff(event.startDate, 'd');
  const payload = {
    ..._.omit(event, '_id'),
    startDate: moment(event.startDate).add(step, 'd'),
    endDate: moment(event.endDate).add(step, 'd'),
  };

  if (await exports.hasConflicts(payload)) {
    delete payload.auxiliary;
    delete payload.repetition;
  }

  return new Event(payload);
};

exports.createRepetitionsEveryDay = async (payload) => {
  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(3, 'M').endOf('M');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    repeatedEvents.push(await exports.formatRepeatedPayload(payload, range[i]));
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsEveryWeekDay = async (payload) => {
  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(3, 'M').endOf('M');
  const range = Array.from(moment().range(start, end).by('days'));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    const day = moment(range[i]).day();
    if (day !== 0 && day !== 6) repeatedEvents.push(await exports.formatRepeatedPayload(payload, range[i]));
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitionsByWeek = async (payload, step) => {
  const start = moment(payload.startDate).add(step, 'w');
  const end = moment(payload.startDate).add(3, 'M').endOf('M');
  const range = Array.from(moment().range(start, end).by('weeks', { step }));
  const repeatedEvents = [];

  for (let i = 0, l = range.length; i < l; i++) {
    repeatedEvents.push(await exports.formatRepeatedPayload(payload, range[i]));
  }

  await Event.insertMany(repeatedEvents);
};

exports.createRepetitions = async (eventFromDb, payload) => {
  if (payload.repetition.frequency === NEVER) return eventFromDb;

  if (_.get(eventFromDb, 'repetition.frequency', NEVER) !== NEVER) {
    await Event.findOneAndUpdate({ _id: eventFromDb._id }, { 'repetition.parentId': eventFromDb._id });
  }

  payload.repetition.parentId = eventFromDb._id;
  switch (payload.repetition.frequency) {
    case EVERY_DAY:
      await exports.createRepetitionsEveryDay(payload);
      break;
    case EVERY_WEEK_DAY:
      await exports.createRepetitionsEveryWeekDay(payload);
      break;
    case EVERY_WEEK:
      await exports.createRepetitionsByWeek(payload, 1);
      break;
    case EVERY_TWO_WEEKS:
      await exports.createRepetitionsByWeek(payload, 2);
      break;
    default:
      break;
  }

  return eventFromDb;
};

exports.updateRepetitions = async (event, payload) => {
  const parentStartDate = moment(payload.startDate);
  const parentEndtDate = moment(payload.endDate);
  const promises = [];

  let unset;
  if (!payload.auxiliary) unset = { auxiliary: '' };
  const events = await Event.find({
    'repetition.parentId': event.repetition.parentId,
    startDate: { $gt: new Date(event.startDate) },
  });
  events.forEach((ev) => {
    const startDate = moment(ev.startDate).hours(parentStartDate.hours());
    startDate.minutes(parentStartDate.minutes());
    const endDate = moment(ev.endDate).hours(parentEndtDate.hours());
    endDate.minutes(parentEndtDate.minutes());
    promises.push(Event.findOneAndUpdate(
      { _id: ev._id },
      {
        $set: flat({ ...payload, startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
        ...(unset && { $unset: unset }),
      }
    ));
  });

  return Promise.all(promises);
};

const isMiscOnlyUpdated = (event, payload) => {
  const mainEventInfo = {
    ..._.pick(event, ['isCancelled', 'startDate', 'endDate', 'status']),
    auxiliary: event.auxiliary.toHexString(),
    sector: event.sector.toHexString(),
  };
  if (event.subscription) mainEventInfo.subscription = event.subscription.toHexString();
  const mainPayloadInfo = _.omit({ ...payload, ...(!payload.isCancelled && { isCancelled: false }) }, ['misc']);

  return !event.misc || event.misc === '' || (payload.misc !== event.misc && _.isEqual(mainEventInfo, mainPayloadInfo));
};

/**
 * 1. If the event is in a repetition and we update it without updating the repetition, we should remove it from the repetition
 * i.e. delete the repetition object. EXCEPT if we are only updating the misc field
 *
 * 2. if the event is cancelled and the payload doesn't contain any cancellation info, it means we should remove the camcellation
 * i.e. delete the cancel object and set isCancelled to false.
 */
exports.updateEvent = async (event, payload, credentials) => {
  await EventHistoriesHelper.createEventHistoryOnUpdate(payload, event, credentials);
  const miscUpdatedOnly = payload.misc && isMiscOnlyUpdated(event, payload);

  let unset;
  let set = payload;
  if (!payload.isCancelled && event.isCancelled) {
    set = { ...set, isCancelled: false };
    unset = { cancel: '' };
  }
  if (isRepetition(event) && !payload.shouldUpdateRepetition && !miscUpdatedOnly) {
    set = { ...set, 'repetition.frequency': NEVER };
    unset = { ...unset, 'repetition.parentId': '' };
  }

  if (!payload.auxiliary) unset = { ...unset, auxiliary: '' };

  event = await EventRepository.updateEvent(event._id, set, unset);
  if (!miscUpdatedOnly && isRepetition(event) && payload.shouldUpdateRepetition) {
    await exports.updateRepetitions(event, payload);
  }

  return exports.populateEventSubscription(event);
};

exports.deleteRepetition = async (params, credentials) => {
  const event = await Event.findOne({ _id: params._id });
  if (!event) return null;

  await EventHistoriesHelper.createEventHistoryOnDelete(event, credentials);

  const { type, repetition } = event;
  if (type !== ABSENCE && repetition && repetition.frequency !== NEVER) {
    await Event.deleteMany({
      'repetition.parentId': event.repetition.parentId,
      startDate: { $gte: new Date(event.startDate) },
      $or: [{ isBilled: false }, { isBilled: { $exists: false } }],
    });
  }

  return event;
};

exports.unassignInterventionsOnContractEnd = async (contract) => {
  const customerSubscriptionsFromEvents = await EventRepository.getCustomerSubscriptions(contract);

  if (customerSubscriptionsFromEvents.length === 0) return;
  let correspondingSubs;
  correspondingSubs = contract.status === COMPANY_CONTRACT
    ? customerSubscriptionsFromEvents.filter(ev => ev.sub.service.type === contract.status)
    : correspondingSubs = customerSubscriptionsFromEvents
      .filter(ev => ev.customer._id === contract.customer && ev.sub.service.type === contract.status);

  const correspondingSubsIds = correspondingSubs.map(sub => sub.sub._id);

  await EventRepository.unassignInterventions(contract.endDate, contract.user, correspondingSubsIds);
};

exports.updateAbsencesOnContractEnd = async (auxiliaryId, contractEndDate) => {
  const maxEndDate = moment(contractEndDate).hour(PLANNING_VIEW_END_HOUR).startOf('h');
  await EventRepository.updateAbsenceEndDate(auxiliaryId, maxEndDate);
};

exports.deleteEvent = async (params, credentials) => {
  const event = await Event.findOne({ _id: params._id });
  if (!event) return null;

  const deletionInfo = _.omit(event, 'repetition');
  await EventHistoriesHelper.createEventHistoryOnDelete(deletionInfo, credentials);
  await Event.deleteOne({ _id: params._id });

  return event;
};

exports.deleteEvents = async (events, credentials) => {
  const promises = [];
  for (const event of events) {
    const deletionInfo = _.omit(event, 'repetition');
    promises.push(EventHistoriesHelper.createEventHistoryOnDelete(deletionInfo, credentials));
  }

  await Promise.all(promises);
  await Event.deleteMany({ _id: { $in: events.map(ev => ev._id) } });
};
