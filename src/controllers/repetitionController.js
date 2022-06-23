const Boom = require('@hapi/boom');
const get = require('lodash/get');
const translate = require('../helpers/translate');
const EventsRepetionHelper = require('../helpers/eventsRepetition');

const { language } = translate;

const list = async (req) => {
  try {
    req.log('repetitionController - list - query', req.query);
    req.log('repetitionController - list - company', get(req, 'auth.credentials.company._id'));

    const repetitions = await EventsRepetionHelper.list(req.query, req.auth.credentials);

    return {
      message: repetitions.length === 0 ? translate[language].repetitionNotFound : translate[language].repetitionsFound,
      data: { repetitions },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list };
