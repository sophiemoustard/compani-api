const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const { getEventHistories } = require('../helpers/eventHistories');

const { language } = translate;

const list = async (req) => {
  try {
    const eventHistories = await getEventHistories(req.query, req.auth.credentials);

    return {
      message: translate[language].eventHistoriesFound,
      data: { eventHistories },
    };
  } catch (e) {
    console.error(e);
    return Boom.isBoom(e) ? e : Boom.badImplementation();
  }
};

module.exports = { list };
