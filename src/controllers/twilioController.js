const Boom = require('boom');
const translate = require('../helpers/translate');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const { language } = translate;

const send = async (req) => {
  try {
    const sms = await twilio.messages.create(req.payload);
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
