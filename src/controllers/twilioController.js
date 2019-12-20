const Boom = require('boom');
const TwilioHelper = require('../helpers/twilio');
const translate = require('../helpers/translate');

const { language } = translate;

const send = async (req) => {
  try {
    const sms = await TwilioHelper.sendMessage(req.payload.to, req.payload.body, req.auth.credentials);

    return {
      message: translate[language].smsSent,
      data: { sms },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { send };
