const Boom = require('boom');
const translate = require('../helpers/translate');
const EventHistoriesHelper = require('../helpers/eventHistories');

const { language } = translate;

const list = async (req) => {
  try {
    const eventHistories = await EventHistoriesHelper.list(req.query, req.auth.credentials);
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
