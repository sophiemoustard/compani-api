const Boom = require('boom');

const Esign = require('../models/ESign');
const translate = require('../helpers/translate');

const { language } = translate;

const show = async (req) => {
  try {
    const docRaw = await Esign.getDocument(req.params.id);
    if (docRaw.data.error) return Boom.notFound(translate[language].documentNotFound);
    return {
      message: translate[language].documentFound,
      data: { document: docRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = { show };
