const Boom = require('boom');
const EventHistory = require('../models/EventHistory');
const translate = require('../helpers/translate');
const { getListQuery } = require('../helpers/eventHistories');

const { language } = translate;

const list = async (req) => {
  try {
    const query = getListQuery(req.query);
    const eventHistories = await EventHistory
      .find(query)
      .populate({ path: 'auxiliaries', select: '_id identity' })
      .populate({ path: 'createdBy', select: '_id identity picture' })
      .populate({ path: 'event.customer', select: '_id identity' })
      .populate({ path: 'event.auxiliary', select: '_id identity' })
      .populate({ path: 'update.auxiliary.from', select: '_id identity' })
      .populate({ path: 'update.auxiliary.to', select: '_id identity' })
      .sort({ createdAt: -1 });

    return {
      message: translate[language].eventHistoriesFound,
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
