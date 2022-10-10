const Boom = require('@hapi/boom');
const moment = require('moment');
const get = require('lodash/get');
const omit = require('lodash/omit');
const cloneDeep = require('lodash/cloneDeep');
const pick = require('lodash/pick');
const has = require('lodash/has');
const {
  NEVER,
  EVERY_DAY,
  EVERY_WEEK_DAY,
  EVERY_WEEK,
  EVERY_TWO_WEEKS,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION,
  INTERNAL_HOUR,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  FORCAST_PERIOD_FOR_CREATING_EVENTS,
  FIELDS_NOT_APPLICABLE_TO_REPETITION,
} = require('./constants');
const Event = require('../models/Event');
const User = require('../models/User');
const Repetition = require('../models/Repetition');
const Customer = require('../models/Customer');
const CustomerAbsencesHelper = require('./customerAbsences');
const EventsHelper = require('./events');
const RepetitionsHelper = require('./repetitions');
const EventsValidationHelper = require('./eventsValidation');
const { CompaniInterval } = require('./dates/companiIntervals');
const translate = require('./translate');
const { CompaniDate } = require('./dates/companiDates');

const { language } = translate;

exports.formatRepeatedPayload = async (event, sector, date) => {
  const step = CompaniDate(date).oldDiff(event.startDate, 'days');
  const isIntervention = event.type === INTERVENTION;
  let payload = {
    ...cloneDeep(omit(event, '_id')), // cloneDeep necessary to copy repetition
    startDate: CompaniDate(event.startDate).oldAdd(step).toISO(),
    endDate: CompaniDate(event.endDate).oldAdd(step).toISO(),
  };
  const hasConflicts = await EventsValidationHelper.hasConflicts(payload);

  if (isIntervention) {
    if (event.auxiliary && hasConflicts) {
      payload = { ...omit(payload, 'auxiliary'), 'repetition.frequency': NEVER, sector };
    }

    const customerIsAbsent = await CustomerAbsencesHelper.isAbsent(event.customer, payload.startDate);
    if (customerIsAbsent) return null;
  } else if (([INTERNAL_HOUR, UNAVAILABILITY].includes(event.type)) && hasConflicts) return null;

  return new Event(payload);
};

exports.createRepeatedEvents = async (payload, range, sector) => {
  const repeatedEvents = [];
  const isIntervention = payload.type === INTERVENTION;

  const customer = isIntervention
    ? await Customer.findOne({ _id: payload.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }).lean()
    : null;

  for (const date of range) {
    const repeatedEvent = await exports.formatRepeatedPayload(payload, sector, date);
    if (isIntervention && has(customer, 'stoppedAt') && get(repeatedEvent, 'startDate') > customer.stoppedAt) break;
    if (repeatedEvent) repeatedEvents.push(repeatedEvent);
  }

  await Event.insertMany(repeatedEvents);
};

exports.getRange = (startDate, stepDuration) => {
  const companiCurrentDate = CompaniDate();
  const companiStartDate = CompaniDate(startDate);
  const lastestDate = companiCurrentDate.isAfter(startDate) ? companiCurrentDate : companiStartDate;

  const start = companiStartDate.oldAdd(stepDuration).toISO();
  const end = lastestDate.startOf('day').oldAdd(FORCAST_PERIOD_FOR_CREATING_EVENTS).toISO();

  return CompaniInterval(start, end).rangeBy(stepDuration);
};

exports.createRepetitions = async (eventFromDb, payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const formattedPayload = RepetitionsHelper.formatPayloadForRepetitionCreation(eventFromDb, payload, companyId);

  if (formattedPayload.repetition.frequency === NEVER) return eventFromDb;

  if (get(eventFromDb, 'repetition.frequency', NEVER) !== NEVER) {
    await Event.updateOne({ _id: eventFromDb._id }, { 'repetition.parentId': eventFromDb._id });
  }
  let sectorId = eventFromDb.sector;
  if (!eventFromDb.sector) {
    const user = await User.findOne({ _id: eventFromDb.auxiliary._id })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });
    sectorId = user.sector;
  }

  let range;
  switch (formattedPayload.repetition.frequency) {
    case EVERY_DAY:
      range = exports.getRange(formattedPayload.startDate, { days: 1 });
      break;
    case EVERY_WEEK_DAY: {
      const rangeByDay = exports.getRange(formattedPayload.startDate, { days: 1 });
      range = rangeByDay
        .filter(date => [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY].includes(CompaniDate(date).weekday()));
      break;
    } case EVERY_WEEK:
      range = exports.getRange(formattedPayload.startDate, { weeks: 1 });
      break;
    case EVERY_TWO_WEEKS:
      range = exports.getRange(formattedPayload.startDate, { weeks: 2 });
      break;
    default:
      break;
  }

  await exports.createRepeatedEvents(formattedPayload, range, sectorId);

  await (new Repetition({ ...formattedPayload, ...formattedPayload.repetition })).save();

  return eventFromDb;
};

exports.updateEventBelongingToRepetition = async (eventPayload, event, companyId, sectorId) => {
  const hasConflicts = await EventsValidationHelper.hasConflicts({
    ...eventPayload,
    company: companyId,
    ...pick(event, ['_id', 'type']),
  });
  if (event.type !== INTERVENTION && hasConflicts) return Event.deleteOne({ _id: event._id });

  const newEventPayload = !eventPayload.auxiliary || hasConflicts
    ? { ...omit(eventPayload, 'auxiliary'), sector: sectorId }
    : { ...eventPayload };

  const detachFromRepetition = !!eventPayload.auxiliary && hasConflicts;
  const editionPayload = EventsHelper.formatEditionPayload(event, newEventPayload, detachFromRepetition);

  return Event.updateOne({ _id: event._id }, editionPayload);
};

exports.updateRepetition = async (eventFromDb, eventPayload, credentials, sectorId) => {
  const promises = [];
  const companyId = get(credentials, 'company._id', null);
  const payloadStartHour = CompaniDate(eventPayload.startDate).getUnits(['hour', 'minute']);
  const payloadEndHour = CompaniDate(eventPayload.endDate).getUnits(['hour', 'minute']);

  const query = {
    'repetition.parentId': eventFromDb.repetition.parentId,
    'repetition.frequency': { $not: { $eq: NEVER } },
    startDate: { $gt: eventFromDb.startDate },
    company: companyId,
  };
  const events = await Event.find(query).lean();

  for (let i = 0, l = events.length; i < l; i++) {
    const formattedEventPayload = {
      ...omit(eventPayload, FIELDS_NOT_APPLICABLE_TO_REPETITION),
      startDate: CompaniDate(events[i].startDate).set(payloadStartHour).toISO(),
      endDate: CompaniDate(events[i].endDate).set(payloadEndHour).toISO(),
    };

    promises.push(exports.updateEventBelongingToRepetition(formattedEventPayload, events[i], companyId, sectorId));
  }

  promises.push(RepetitionsHelper.updateRepetitions(eventPayload, eventFromDb.repetition.parentId));
  await Promise.all(promises);

  return eventFromDb;
};

exports.isRepetitionValid = repetition => repetition.frequency !== NEVER && !!repetition.parentId;

exports.deleteRepetition = async (event, credentials) => {
  const { type, repetition } = event;
  if (type === ABSENCE || !repetition) return;
  if (!exports.isRepetitionValid(repetition)) throw Boom.badData(translate[language].invalidRepetition);

  const query = {
    'repetition.parentId': event.repetition.parentId,
    startDate: { $gte: event.startDate },
    company: get(credentials, 'company._id'),
  };

  await EventsHelper.deleteEventsAndRepetition(query, true, credentials);
};

exports.formatEventBasedOnRepetition = async (repetition, date) => {
  const { frequency, parentId, startDate, endDate } = repetition;
  const startDateObj = moment(startDate).toObject();
  const endDateObj = moment(endDate).toObject();
  const timeFields = ['hours', 'minutes', 'seconds', 'milliseconds'];
  const newEventStartDate = moment(date).add(90, 'd').set(pick(startDateObj, timeFields)).toDate();
  const newEventEndDate = moment(date).add(90, 'd').set(pick(endDateObj, timeFields)).toDate();
  const pickedFields = [
    'type',
    'customer',
    'subscription',
    'auxiliary',
    'sector',
    'misc',
    'internalHour',
    'address',
    'company',
  ];
  let newEvent = {
    ...pick(cloneDeep(repetition), pickedFields),
    startDate: newEventStartDate,
    endDate: newEventEndDate,
    repetition: { frequency, parentId },
  };

  const hasConflicts = await EventsValidationHelper.hasConflicts(newEvent);
  if ([INTERNAL_HOUR, UNAVAILABILITY].includes(newEvent.type) && hasConflicts) return null;

  if (newEvent.type === INTERVENTION && newEvent.auxiliary && hasConflicts) {
    newEvent = await EventsHelper.detachAuxiliaryFromEvent(newEvent, repetition.company);
  }

  return newEvent;
};
