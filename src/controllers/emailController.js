const Boom = require('boom');
const translate = require('../helpers/translate');
const { helperWelcomeEmail } = require('../helpers/email');

const { language } = translate;

const sendWelcome = async (req) => {
  try {
    const mailInfo = await helperWelcomeEmail(req.payload.receiver, req.auth.credentials.company);

    return { message: translate[language].emailSent, data: { mailInfo } };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = {
  sendWelcome,
};

