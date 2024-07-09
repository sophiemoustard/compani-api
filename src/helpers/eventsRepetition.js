const Boom = require('@hapi/boom');
const get = require('lodash/get');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const {
  NEVER,
  ABSENCE,
  INTERVENTION,
  FIELDS_NOT_APPLICABLE_TO_REPETITION,
} = require('./constants');
const Event = require('../models/Event');
const EventsHelper = require('./events');
const RepetitionsHelper = require('./repetitions');
const EventsValidationHelper = require('./eventsValidation');
const translate = require('./translate');
const { CompaniDate } = require('./dates/companiDates');

const { language } = translate;

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
