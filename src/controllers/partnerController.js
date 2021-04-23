const Boom = require('@hapi/boom');
const translate = require('../helpers/translate');
const PartnersHelper = require('../helpers/partners');

const { language } = translate;

const list = async (req) => {
  try {
    const partners = await PartnersHelper.list(req.auth.credentials);

    return {
      message: partners.length ? translate[language].partnersFound : translate[language].partnersNotFound,
      data: { partners },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list };
