const Boom = require('@hapi/boom');
const HelpersHelper = require('../helpers/helpers');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const helpers = await HelpersHelper.list(req.query, req.auth.credentials);

    return {
      message: helpers.length ? translate[language].helpersFound : translate[language].helpersNotFound,
      data: { helpers },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await HelpersHelper.update(req.params._id, req.payload);

    return { message: translate[language].helperUpdated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, update };
