const moment = require('moment');
const omit = require('lodash/omit');
const Repetition = require('../models/Repetition');
const EventsHelper = require('./events');

exports.updateRepetitions = async (eventPayload, parentId) => {
  const repetition = await Repetition.findOne({ parentId });
  if (!repetition) return;

  const eventStartDate = moment(eventPayload.startDate);
  const eventEndDate = moment(eventPayload.endDate);
  const startDate = moment(repetition.startDate)
    .hours(eventStartDate.hours())
    .minutes(eventStartDate.minutes()).toISOString();
  const endDate = moment(repetition.endDate)
    .hours(eventEndDate.hours())
    .minutes(eventEndDate.minutes()).toISOString();

  const repetitionPayload = { ...omit(eventPayload, ['_id']), startDate, endDate };
  const payload = EventsHelper.formatEditionPayload(repetition, repetitionPayload, false);
  await Repetition.findOneAndUpdate({ parentId }, payload);
};
