const Boom = require('@hapi/boom');
const moment = require('moment');
const get = require('lodash/get');
const omit = require('lodash/omit');
const set = require('lodash/set');
const cloneDeep = require('lodash/cloneDeep');
const pick = require('lodash/pick');
const has = require('lodash/has');
const momentRange = require('moment-range');
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
} = require('./constants');
const Event = require('../models/Event');
const User = require('../models/User');
const Repetition = require('../models/Repetition');
const Customer = require('../models/Customer');
const CustomerAbsencesHelper = require('./customerAbsences');
const EventsHelper = require('./events');
const RepetitionsHelper = require('./repetitions');
const EventsValidationHelper = require('./eventsValidation');
const DatesHelper = require('./dates');
const translate = require('./translate');

const { language } = translate;

momentRange.extendMoment(moment);

exports.formatRepeatedPayload = async (event, sector, momentDay) => {
  const step = momentDay.diff(event.startDate, 'd');
  const isIntervention = event.type === INTERVENTION;
  let payload = {
    ...cloneDeep(omit(event, '_id')), // cloneDeep necessary to copy repetition
    startDate: moment(event.startDate).add(step, 'd'),
    endDate: moment(event.endDate).add(step, 'd'),
  };
  const hasConflicts = await EventsValidationHelper.hasConflicts(payload);

  if (isIntervention) {
    if (event.auxiliary && hasConflicts) {
      payload = { ...omit(payload, 'auxiliary'), 'repetition.frequency': NEVER, sector };
    }
    if (([INTERNAL_HOUR, UNAVAILABILITY].includes(event.type)) && hasConflicts) return null;
  
    const customerIsAbsent = await CustomerAbsencesHelper.isAbsent(event.customer, payload.startDate);
    if (customerIsAbsent) return null;
  }
  return new Event(payload);
};

exports.createRepeatedEvents = async (payload, range, sector, isWeekDayRepetition) => {
  const repeatedEvents = [];
  const isIntervention = payload.type === INTERVENTION;

  const customer = isIntervention
    ? await Customer.findOne({ _id: payload.customer, stoppedAt: { $exists: true } }, { stoppedAt: 1 }).lean()
    : null;

  for (let i = 0, l = range.length; i < l; i++) {
    if (!isWeekDayRepetition || ![0, 6].includes(moment(range[i]).day())) {
      const repeatedEvent = await exports.formatRepeatedPayload(payload, sector, range[i]);
      if (isIntervention && has(customer, 'stoppedAt') && get(repeatedEvent, 'startDate') > customer.stoppedAt) break;
      if (repeatedEvent) repeatedEvents.push(repeatedEvent);
    }
  }

  await Event.insertMany(repeatedEvents);
};

const getNumberOfDays = (startDate) => {
  const formattedCurrentDate = moment().startOf('d').toDate();
  const formattedStartDate = moment(startDate).startOf('d').toDate();
  const dayDiffWithStartDate = DatesHelper.dayDiff(formattedCurrentDate, formattedStartDate);

  return dayDiffWithStartDate > 0 ? dayDiffWithStartDate + 90 : 90;
};

exports.createRepetitionsEveryDay = async (payload, sector) => {
  const numberOfDays = getNumberOfDays(payload.startDate);

  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(numberOfDays, 'd');
  const range = Array.from(moment().range(start, end).by('days'));

  await exports.createRepeatedEvents(payload, range, sector, false);
};

exports.createRepetitionsEveryWeekDay = async (payload, sector) => {
  const numberOfDays = getNumberOfDays(payload.startDate);

  const start = moment(payload.startDate).add(1, 'd');
  const end = moment(payload.startDate).add(numberOfDays, 'd');
  const range = Array.from(moment().range(start, end).by('days'));

  await exports.createRepeatedEvents(payload, range, sector, true);
};

exports.createRepetitionsByWeek = async (payload, sector, step) => {
  const numberOfDays = getNumberOfDays(payload.startDate);

  const start = moment(payload.startDate).add(step, 'w');
  const end = moment(payload.startDate).add(numberOfDays, 'd');
  const range = Array.from(moment().range(start, end).by('weeks', { step }));

  await exports.createRepeatedEvents(payload, range, sector, false);
};

exports.createRepetitions = async (eventFromDb, payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  if (payload.repetition.frequency === NEVER) return eventFromDb;

  if (get(eventFromDb, 'repetition.frequency', NEVER) !== NEVER) {
    await Event.updateOne({ _id: eventFromDb._id }, { 'repetition.parentId': eventFromDb._id });
  }
  let sectorId = eventFromDb.sector;
  if (!eventFromDb.sector) {
    const user = await User.findOne({ _id: eventFromDb.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean({ autopopulate: true, virtuals: true });
    sectorId = user.sector;
  }

  switch (payload.repetition.frequency) {
    case EVERY_DAY:
      await exports.createRepetitionsEveryDay(payload, sectorId);
      break;
    case EVERY_WEEK_DAY:
      await exports.createRepetitionsEveryWeekDay(payload, sectorId);
      break;
    case EVERY_WEEK:
      await exports.createRepetitionsByWeek(payload, sectorId, 1);
      break;
    case EVERY_TWO_WEEKS:
      await exports.createRepetitionsByWeek(payload, sectorId, 2);
      break;
    default:
      break;
  }

  await (new Repetition({ ...payload, ...payload.repetition })).save();

  return eventFromDb;
};

exports.updateRepetition = async (eventFromDb, eventPayload, credentials) => {
  const parentStartDate = moment(eventPayload.startDate);
  const parentEndDate = moment(eventPayload.endDate);
  const promises = [];
  const companyId = get(credentials, 'company._id', null);

  const query = {
    'repetition.parentId': eventFromDb.repetition.parentId,
    'repetition.frequency': { $not: { $eq: NEVER } },
    startDate: { $gte: new Date(eventFromDb.startDate) },
    company: companyId,
  };
  const events = await Event.find(query).lean();

  let sectorId = eventFromDb.sector;
  if (!eventFromDb.sector) {
    const user = await User.findOne({ _id: eventFromDb.auxiliary })
      .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .lean();
    sectorId = user.sector;
  }

  for (let i = 0, l = events.length; i < l; i++) {
    const customerIsAbsent = await CustomerAbsencesHelper.isAbsent(events[i].customer, events[i].startDate);
    if (customerIsAbsent) continue;
  
    const startDate = moment(events[i].startDate).hours(parentStartDate.hours())
      .minutes(parentStartDate.minutes()).toISOString();
    const endDate = moment(events[i].endDate).hours(parentEndDate.hours())
      .minutes(parentEndDate.minutes()).toISOString();
    let eventToSet = { ...eventPayload, startDate, endDate, _id: events[i]._id };

    const hasConflicts = await EventsValidationHelper.hasConflicts({ ...eventToSet, company: companyId });
    if (eventFromDb.type !== INTERVENTION && hasConflicts) promises.push(Event.deleteOne({ _id: events[i]._id }));
    else {
      const detachFromRepetition = !!eventPayload.auxiliary && hasConflicts;
      if (detachFromRepetition || !eventPayload.auxiliary) {
        eventToSet = set(omit(eventToSet, 'auxiliary'), 'sector', sectorId);
      }

      const payload = EventsHelper.formatEditionPayload(events[i], eventToSet, detachFromRepetition);
      promises.push(Event.updateOne({ _id: events[i]._id }, payload));
    }
  }

  await Promise.all([
    ...promises,
    RepetitionsHelper.updateRepetitions(eventPayload, eventFromDb.repetition.parentId),
  ]);

  return eventFromDb;
};

exports.isRepetitionValid = repetition => repetition.frequency !== NEVER && !!repetition.parentId;

exports.deleteRepetition = async (event, credentials) => {
  const { type, repetition } = event;
  if (type === ABSENCE || !repetition) return;
  if (!exports.isRepetitionValid(repetition)) throw Boom.badData(translate[language].invalidRepetition);

  const query = {
    'repetition.parentId': event.repetition.parentId,
    startDate: { $gte: new Date(event.startDate) },
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
