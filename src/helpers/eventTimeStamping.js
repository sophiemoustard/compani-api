const Boom = require('@hapi/boom');
const EventHistoriesHelper = require('./eventHistories');
const DatesHelper = require('./dates');
const EventValidationHelper = require('./eventsValidation');
const Event = require('../models/Event');
const translate = require('./translate');

const { language } = translate;

exports.isTimeStampAllowed = async (event, startDate) => {
  if (DatesHelper.isSameOrAfter(startDate, event.endDate)) throw Boom.badData(translate[language].timeStampTooLate);
  if (await EventValidationHelper.hasConflicts({ ...event, startDate })) {
    throw Boom.conflict(translate[language].timeStampConflict);
  }

  return true;
};

exports.addTimeStamp = async (event, payload, credentials) => {
  if (!(await exports.isTimeStampAllowed(event, payload.startDate))) {
    throw Boom.conflict(translate[language].timeStampOtherConflict);
  }

  await EventHistoriesHelper.createTimeStampHistory(event, payload, credentials);
  await Event.updateOne({ _id: event._id }, { startDate: payload.startDate });
};
