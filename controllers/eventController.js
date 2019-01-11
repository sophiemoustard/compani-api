const Boom = require('boom');
const moment = require('moment');
const flat = require('flat');
const translate = require('../helpers/translate');
const Event = require('../models/Event');
const { populateEventsListSubscription } = require('../helpers/events');

const { language } = translate;

const list = async (req) => {
  try {
    const query = { ...req.query };
    if (req.query.startDate) query.startDate = { $gte: moment(req.query.startDate, 'YYYYMMDD').toDate() };
    if (req.query.endDate) query.endDate = { $lte: moment(req.query.endDate, 'YYYYMMDD').toDate() };

    const events = await Event.find(query)
      .populate({ path: 'auxiliary', select: 'firstname lastname' })
      .populate({ path: 'customer', select: 'identity subscriptions' });

    if (events.length === 0) return Boom.notFound(translate[language].eventsNotFound);

    const populatedEvents = await populateEventsListSubscription(events);

    return {
      message: translate[language].eventsFound,
      data: populatedEvents
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    let event = new Event(req.payload);
    await event.save();
    event = await Event.findOne({ _id: event._id })
      .populate({ path: 'auxiliary', select: 'firstname lastname' })
      .populate({ path: 'customer', select: 'identity subscriptions' })
      .lean();

    const populatedEvent = populateEventSubscription(event);

    return {
      message: translate[language].eventCreated,
      data: { event: populatedEvent },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {};

const remove = async (req) => {};

module.exports = {
  list,
  create,
  update,
  remove,
};
