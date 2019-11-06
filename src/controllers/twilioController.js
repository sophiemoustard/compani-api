const Boom = require('boom');
const TwilioHelper = require('../helpers/twilio');
const translate = require('../helpers/translate');

const { language } = translate;

const send = async (req) => {
  try {
    const { to, from, body } = req.payload;
    const sms = await TwilioHelper.sendMessage(to, from, body);
    return {
      message: translate[language].smsSent,
      data: { sms },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = { send };
