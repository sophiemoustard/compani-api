const Boom = require('@hapi/boom');
const get = require('lodash/get');
const InternalHour = require('../models/InternalHour');
const EventsHelper = require('./events');

exports.create = async (payload, credentials) =>
  InternalHour.create({ ...payload, company: get(credentials, 'company._id') });

exports.removeInternalHour = async (internalHour, date) => {
  const defaultInternalHour = await InternalHour.findOne({ default: true, company: internalHour.company }).lean();
  if (!defaultInternalHour) throw Boom.badImplementation('No default internal hour set');

  return Promise.all([
    EventsHelper.updateEventsInternalHourType(date, internalHour._id, defaultInternalHour._id),
    InternalHour.findByIdAndRemove(internalHour._id),
  ]);
};
