const Boom = require('boom');
const translate = require('../helpers/translate');
const EventHistoryRepository = require('../repositories/EventHistoryRepository');
const { getListQuery } = require('../helpers/eventHistories');

const { language } = translate;

const list = async (req) => {
  try {
    const { createdAt } = req.query;
    const query = getListQuery(req.query);
    const eventHistories = await EventHistoryRepository.paginate(query, createdAt, req.auth.credentials);

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
