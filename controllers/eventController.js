const Boom = require('boom');
const _ = require('lodash');
const translate = require('../helpers/translate');
const Event = require('../models/Event');

const { language } = translate;

const list = async (req) => {};

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
