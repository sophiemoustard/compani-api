const Boom = require('@hapi/boom');
const CardHelper = require('../helpers/cards');
const translate = require('../helpers/translate');

const { language } = translate;

const update = async (req) => {
  try {
    await CardHelper.updateCard(req.params._id, req.payload);

    return {
      message: translate[language].cardUpdated,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  update,
};
