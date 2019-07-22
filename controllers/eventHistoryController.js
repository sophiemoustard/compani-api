const Boom = require('boom');
const EventHistory = require('../models/EventHistory');

const list = async (req) => {
  try {
    const eventHistories = await EventHistory
      .find(req.query)
      .populate({ path: 'auxiliaries', select: '_id identity' })
      .populate({ path: 'createdBy', select: '_id identity' })
      .populate({ path: 'event.customer', select: '_id identity' });

    return {
      message: '',
      data: { eventHistories },
    };
  } catch (e) {
    console.error(e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

module.exports = {
  list,
};
