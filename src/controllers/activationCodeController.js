const Boom = require('boom');
const translate = require('../helpers/translate');
const activationCodeHelper = require('../helpers/activationCode');

const { language } = translate;

const createActivationCode = async (req) => {
  try {
    const activationCode = await activationCodeHelper.createActivationCode(req.payload, req.auth.credentials);
    return { message: translate[language].activationCodeCreated, data: { activationCode } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

const checkActivationCode = async (req) => {
  try {
    const activationCode = await activationCodeHelper.checkActivationCode(req.params);
    return {
      message: translate[language].activationCodeValidated,
      data: { activationCode },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(translate[language].unexpectedBehavior);
  }
};

module.exports = {
  createActivationCode,
  checkActivationCode,
};
