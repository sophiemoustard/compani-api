const Boom = require('@hapi/boom');
const EventHistoriesHelper = require('./eventHistories');
const DatesHelper = require('./dates');
const EventValidationHelper = require('./eventsValidation');
const Event = require('../models/Event');
const translate = require('./translate');
const { NEVER } = require('./constants');

const { language } = translate;

exports.isStartDateTimeStampAllowed = async (event, startDate) => {
  if (DatesHelper.isSameOrAfter(startDate, event.endDate)) throw Boom.badData(translate[language].timeStampTooLate);
  if (await EventValidationHelper.hasConflicts({ ...event, startDate })) {
    throw Boom.conflict(translate[language].timeStampConflict);
  }

  return true;
};

exports.isEndDateTimeStampAllowed = async (event, endDate) => {
  if (DatesHelper.isSameOrAfter(event.startDate, endDate)) throw Boom.badData(translate[language].timeStampTooEarly);
  if (await EventValidationHelper.hasConflicts({ ...event, endDate })) {
    throw Boom.conflict(translate[language].timeStampConflict);
  }

  return true;
};

exports.addTimeStamp = async (event, payload, credentials) => {
  if (payload.startDate && !(await exports.isStartDateTimeStampAllowed(event, payload.startDate))) {
    throw Boom.conflict(translate[language].timeStampOtherConflict);
  } else if (payload.endDate && !(await exports.isEndDateTimeStampAllowed(event, payload.endDate))) {
    throw Boom.conflict(translate[language].timeStampOtherConflict);
  }

  await EventHistoriesHelper.createTimeStampHistory(event, payload, credentials);

  const updatePayload = { 'repetition.frequency': NEVER };
  if (payload.startDate) updatePayload.startDate = payload.startDate;
  else updatePayload.endDate = payload.endDate;
  await Event.updateOne({ _id: event._id }, updatePayload);
};
