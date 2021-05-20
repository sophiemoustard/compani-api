const Boom = require('@hapi/boom');
const EventHistoriesHelper = require('./eventHistories');
const DatesHelper = require('./dates');
const EventValidationHelper = require('./eventsValidation');
const Event = require('../models/Event');

exports.isTimeStampAllowed = async (event, startDate) => {
  if (DatesHelper.isSameOrAfter(startDate, event.endDate)) throw Boom.badData();
  if (await EventValidationHelper.hasConflicts({ ...event, startDate })) throw Boom.conflict();

  return true;
};

exports.addTimeStamp = async (event, payload) => {
  if (!(await exports.isTimeStampAllowed(event, payload.startDate))) throw Boom.conflict();

  await EventHistoriesHelper.createTimeStampHistory(event, payload);
  await Event.updateOne({ _id: event._id }, { startDate: payload.startDate });
};
