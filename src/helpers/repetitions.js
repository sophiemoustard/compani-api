const omit = require('lodash/omit');
const get = require('lodash/get');
const Repetition = require('../models/Repetition');
const EventsHelper = require('./events');
const { CompaniDate } = require('./dates/companiDates');
const { FIELDS_NOT_APPLICABLE_TO_REPETITION } = require('./constants');

exports.updateRepetitions = async (eventPayload, parentId) => {
  const repetition = await Repetition.findOne({ parentId }).lean();
  if (!repetition) return;

  const payloadStartHour = CompaniDate(eventPayload.startDate).getUnits(['hour', 'minute']);
  const payloadEndHour = CompaniDate(eventPayload.endDate).getUnits(['hour', 'minute']);
  const startDate = CompaniDate(repetition.startDate).set(payloadStartHour).toISO();
  const endDate = CompaniDate(repetition.endDate).set(payloadEndHour).toISO();

  const repetitionPayload = { ...omit(eventPayload, ['_id']), startDate, endDate };
  const payload = EventsHelper.formatEditionPayload(repetition, repetitionPayload, false);
  await Repetition.findOneAndUpdate({ parentId }, payload);
};

exports.formatPayloadForRepetitionCreation = (event, payload, companyId) => ({
  ...omit(payload, FIELDS_NOT_APPLICABLE_TO_REPETITION),
  company: companyId,
  repetition: { ...payload.repetition, parentId: event._id },
});

exports.list = async (query, credentials) => {
  const companyId = get(credentials, 'company._id', null);

  const repetitions = await Repetition
    .find({ auxiliary: query.auxiliary, company: companyId }, { attachement: 0, misc: 0, address: 0, sector: 0 })
    .populate({
      path: 'customer',
      select: 'identity subscriptions.service subscriptions._id',
      populate: { path: 'subscriptions.service', select: 'versions.name versions.createdAt' },
    })
    .populate({ path: 'internalHour', select: 'name' })
    .lean();

  return repetitions;
};

exports.remove = async (repetitionId, startDate, credentials) => {
  const companyId = get(credentials, 'company._id');
  const bddRepetition = await Repetition.findOne({ _id: repetitionId, company: companyId }, { parentId: 1 }).lean();

  const query = { 'repetition.parentId': bddRepetition.parentId, startDate: { $gte: startDate }, company: companyId };

  await EventsHelper.deleteEventsAndRepetition(query, true, credentials);
};
