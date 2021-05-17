const Boom = require('@hapi/boom');
const EventHistoriesHelper = require('./eventHistories');
const DatesHelper = require('./dates');
const EventValidationHelper = require('./eventsValidation');
const Event = require('../models/Event');

exports.isTimeStampAllowed = (event, startDate) => {
  if (DatesHelper.isSameOrAfter(startDate, event.endDate)) throw Boom.badData();
  if (EventValidationHelper.hasConflicts({ ...event, startDate })) throw Boom.conflict();

  return true;
};

exports.addTimeStamp = async (event, payload) => {
  if (!exports.isTimeStampAllowed(event, payload)) return;

  EventHistoriesHelper.createTimeStampHistory(event, payload.startDate);
  Event.updateOne({ _id: event._id }, { startDate: payload.startDate });
};
