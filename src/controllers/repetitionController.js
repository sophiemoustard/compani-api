const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const RepetitionHelper = require('../helpers/repetitions');

const { language } = translate;

const list = async (req) => {
  try {
    const repetitions = await RepetitionHelper.list(req.query, req.auth.credentials);

    return {
      message: repetitions.length === 0 ? translate[language].repetitionNotFound : translate[language].repetitionsFound,
      data: { repetitions },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const remove = async (req) => {
  try {
    await RepetitionHelper.remove(req.params._id, req.query.startDate, req.auth.credentials);

    return {
      message: translate[language].repetitionDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, remove };
