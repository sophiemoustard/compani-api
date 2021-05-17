const EventHistoriesHelper = require('./eventHistories');
const Event = require('../models/Event');

exports.isTimeStampAllowed = (event, payload) => {};

exports.addTimeStamp = async (event, payload) => {
  if (!exports.isTimeStampAllowed(event, payload)) return;

  EventHistoriesHelper.createTimeStampHistory(event, payload);
  Event.updateOne({ _id: event._id }, { startDate: payload.startDate });
};
