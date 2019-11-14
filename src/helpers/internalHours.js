const Boom = require('boom');
const InternalHour = require('../models/InternalHour');
const EventsHelper = require('./events');

exports.removeInternalHour = async (internalHour) => {
  const defaultInternalHour = await InternalHour.findOne({ default: true, company: internalHour.company });
  if (!defaultInternalHour) throw Boom.badImplementation('No default internal hour set');
  return Promise.all([
    EventsHelper.updateEventsInternalHourType(new Date(), internalHour._id, defaultInternalHour._id),
    InternalHour.findByIdAndRemove(internalHour._id),
  ]);
};
