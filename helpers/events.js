const Boom = require('boom');
const moment = require('moment');
const flat = require('flat');
const _ = require('lodash');
const momentRange = require('moment-range');
const {
  INTERVENTION,
  INTERNAL_HOUR,
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
  ABSENCE,
  UNAVAILABILITY,
} = require('./constants');
const Event = require('../models/Event');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Contract = require('../models/Contract');
const { populateSubscriptionsServices } = require('../helpers/subscriptions');

momentRange.extendMoment(moment);

const auxiliaryHasActiveCompanyContractOnDay = (contracts, day) => contracts.some(contract => contract.status === COMPANY_CONTRACT &&
  moment(contract.startDate).isSameOrBefore(day, 'd') &&
  ((!contract.endDate && contract.versions.some(version => version.isActive)) || moment(contract.endDate).isAfter(day, 'd')));

const hasConflicts = async (event) => {
  const auxiliaryEvents = await Event.find({
    auxiliary: event.auxiliary,
    startDate: { $gte: event.startDate, $lt: event.endDate },
    endDate: { $gt: event.startDate, $lte: event.endDate },
  });

  return auxiliaryEvents.some((ev) => {
    if (event._id && event._id.toHexString() === ev._id.toHexString()) return false;
    return moment(event.startDate).isBetween(ev.startDate, ev.endDate, 'minutes', '[]') ||
      moment(ev.startDate).isBetween(event.startDate, event.endDate, 'minutes', '[]');
  });
};

const isCreationAllowed = async (event) => {
  if (await hasConflicts(event)) return false;

  let user = await User.findOne({ _id: event.auxiliary }).populate('contracts');
  user = user.toObject();
  if (!user.contracts || user.contracts.length === 0) {
    return false;
  }

  // If the event is an intervention :
  // - if it's a customer contract subscription, the auxiliary should have an active contract with the customer on the day of the intervention
  // - else (company contract subscription) the auxiliary should have an active contract on the day of the intervention and this customer
  //   should have an active subscription
  if (event.type === INTERVENTION) {
    let customer = await Customer.findOne({ _id: event.customer }).populate('subscriptions.service');
    customer = await populateSubscriptionsServices(customer.toObject());

    const eventSubscription = customer.subscriptions.find(sub => sub._id.toHexString() == event.subscription);
    if (!eventSubscription) return false;

    if (eventSubscription.service.type === CUSTOMER_CONTRACT) {
      const contractBetweenAuxAndCus = await Contract.findOne({ user: event.auxiliary, customer: event.customer });
      if (!contractBetweenAuxAndCus) return false;
      return contractBetweenAuxAndCus.endDate
        ? moment(event.startDate).isBetween(contractBetweenAuxAndCus.startDate, contractBetweenAuxAndCus.endDate, '[]')
        : moment(event.startDate).isSameOrAfter(contractBetweenAuxAndCus.startDate);
    }

    return auxiliaryHasActiveCompanyContractOnDay(user.contracts, event.startDate);
  }

  // If the auxiliary is only under customer contract, create internal hours is not allowed
  if (event.type === INTERNAL_HOUR) {
    return auxiliaryHasActiveCompanyContractOnDay(user.contracts, event.startDate);
  }

  return true;
};

const isEditionAllowed = async (eventFromDB, payload) => {
  if (eventFromDB.type === INTERVENTION && eventFromDB.isBilled) return false;

  if ([ABSENCE, UNAVAILABILITY].includes(eventFromDB.type) && payload.auxiliary && payload.auxiliary !== eventFromDB.auxiliary.toHexString()) {
    return false;
  }

  return isCreationAllowed({ ...eventFromDB.toObject(), ...payload });
};

const getListQuery = (req) => {
  let query = req.query.type ? { type: req.query.type } : {};
  if (req.query.auxiliary) query.auxiliary = { $in: req.query.auxiliary };
  if (req.query.customer) query.customer = { $in: req.query.customer };
  if (req.query.isBilled) query.customer = req.query.isBilled;
  if (req.query.startDate && req.query.endDate) {
    const searchStartDate = moment(req.query.startDate, 'YYYYMMDD hh:mm').toDate();
    const searchEndDate = moment(req.query.endDate, 'YYYYMMDD hh:mm').toDate();
    query = {
      ...query,
      $or: [
        { startDate: { $lte: searchEndDate, $gte: searchStartDate } },
        { endDate: { $lte: searchEndDate, $gte: searchStartDate } },
        { endDate: { $gte: searchEndDate }, startDate: { $lte: searchStartDate } },
      ],
    };
  } else if (req.query.startDate && !req.query.endDate) {
    const searchStartDate = moment(req.query.startDate, 'YYYYMMDD hh:mm').toDate();
    query = {
      ...query,
      $or: [
        { startDate: { $gte: searchStartDate } },
        { endDate: { $gte: searchStartDate } },
      ],
    };
  } else if (req.query.endDate) {
    const searchEndDate = moment(req.query.endDate, 'YYYYMMDD hh:mm').toDate();
    query = {
      ...query,
      $or: [
        { startDate: { $lte: searchEndDate } },
        { endDate: { $lte: searchEndDate } },
      ],
    };
  }

  return query;
};

const populateEventSubscription = (event) => {
  if (event.type !== INTERVENTION) return event;
  if (!event.customer || !event.customer.subscriptions) throw Boom.badImplementation();

  const subscription = event.customer.subscriptions.find(sub => sub._id.toHexString() === event.subscription.toHexString());
  if (!subscription) throw Boom.badImplementation();

  return { ...event, subscription };
};

const populateEvents = async (events) => {
  const populatedEvents = [];
  for (let i = 0; i < events.length; i++) {
    const event = await populateEventSubscription(events[i]);
    populatedEvents.push(event);
  }

  return populatedEvents;
};

const updateEventsInternalHourType = async (oldInternalHourId, newInternalHour) => {
  const payload = { internalHour: newInternalHour };
  await Event.update(
    {
      type: INTERNAL_HOUR,
      'internalHour._id': oldInternalHourId,
      startDate: { $gte: moment().toDate() }
    },
    { $set: payload },
    { multi: true },
  );
};

const createRepetitionsEveryDay = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('days'));
  const promises = [];
  range.forEach((day, index) => {
    const repeatedEvent = new Event({
      ..._.omit(event, '_id'),
      startDate: moment(event.startDate).add(index + 1, 'd'),
      endDate: moment(event.endDate).add(index + 1, 'd'),
    });

    promises.push(repeatedEvent.save());
  });

  return Promise.all(promises);
};

const createRepetitionsEveryWeekDay = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('days'));
  const promises = [];
  range.forEach((day, index) => {
    if (moment(day).day() !== 0 && moment(day).day() !== 6) {
      const repeatedEvent = new Event({
        ..._.omit(event, '_id'),
        startDate: moment(event.startDate).add(index + 1, 'd'),
        endDate: moment(event.endDate).add(index + 1, 'd'),
      });

      promises.push(repeatedEvent.save());
    }
  });

  return Promise.all(promises);
};

const createRepetitionsEveryWeek = async (event) => {
  const range = Array.from(moment().range(moment(event.startDate).add(1, 'd'), moment(event.startDate).add(1, 'Y')).by('weeks'));
  const promises = [];
  range.forEach((day, index) => {
    const repeatedEvent = new Event({
      ..._.omit(event, '_id'),
      startDate: moment(event.startDate).add(index + 1, 'w'),
      endDate: moment(event.endDate).add(index + 1, 'w'),
    });

    promises.push(repeatedEvent.save());
  });

  return Promise.all(promises);
};

const createRepetitions = async (event) => {
  if (event.repetition.frequency === NEVER) return event;

  event.repetition.parentId = event._id;
  await Event.findOneAndUpdate({ _id: event._id }, { 'repetition.parentId': event._id });

  switch (event.repetition.frequency) {
    case EVERY_DAY:
      await createRepetitionsEveryDay(event);
      break;
    case EVERY_WEEK_DAY:
      await createRepetitionsEveryWeekDay(event);
      break;
    case EVERY_WEEK:
      await createRepetitionsEveryWeek(event);
      break;
    default:
      break;
  }

  return event;
};

const updateRepetitions = async (event, payload) => {
  const parentStartDate = moment(payload.startDate);
  const parentEndtDate = moment(payload.endDate);
  const promises = [];

  const events = await Event.find({ 'repetition.parentId': event.repetition.parentId, startDate: { $gt: new Date(event.startDate) } });
  events.forEach((ev) => {
    const startDate = moment(ev.startDate).hours(parentStartDate.hours());
    startDate.minutes(parentStartDate.minutes());
    const endDate = moment(ev.endDate).hours(parentEndtDate.hours());
    endDate.minutes(parentEndtDate.minutes());
    promises.push(Event.findOneAndUpdate(
      { _id: ev._id },
      { $set: flat({ ...payload, startDate: startDate.toISOString(), endDate: endDate.toISOString() }) }
    ));
  });

  return Promise.all(promises);
};

const deleteRepetition = async (event) => {
  await Event.deleteMany({ 'repetition.parentId': event.repetition.parentId, startDate: { $gt: new Date(event.startDate) } });
};

module.exports = {
  isCreationAllowed,
  isEditionAllowed,
  getListQuery,
  populateEventSubscription,
  populateEvents,
  updateEventsInternalHourType,
  createRepetitions,
  updateRepetitions,
  deleteRepetition,
};
