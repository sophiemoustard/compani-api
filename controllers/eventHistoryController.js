const Boom = require('boom');
const { getEventHistoryList } = require('../repositories/EventHistoryRepository');
const translate = require('../helpers/translate');
const { getListQuery } = require('../helpers/eventHistories');

const { language } = translate;

const list = async (req) => {
  try {
    const query = getListQuery(req.query);
    const eventHistories = await getEventHistoryList(query);

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
