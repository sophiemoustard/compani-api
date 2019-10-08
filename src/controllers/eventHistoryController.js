const Boom = require('boom');
// const { getEventHistoryList } = require('../repositories/EventHistoryRepository');
const translate = require('../helpers/translate');
const EventHistory = require('../models/EventHistory');
const { getListQuery } = require('../helpers/eventHistories');

const { language } = translate;

const list = async (req) => {
  try {
    const { lastId, pageSize } = req.query;
    const query = getListQuery(req.query);
    const eventHistories = await EventHistory.paginate(query, pageSize, lastId);

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
