const Boom = require('boom');
const translate = require('../helpers/translate');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const { language } = translate;

const list = async (req) => {
  try {
    const messageList = [];
    const opts = {};
    if (req.query.limit) {
      opts.limit = req.query.limit;
    }
    const messages = await new Promise((resolve) => {
      twilio.messages.each({
        done() {
          resolve(messageList);
        },
        opts
      }, (message) => {
        messageList.push(message);
      });
    });
    return messages;
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const send = async (req) => {
  try {
    const sms = await twilio.messages.create(req.payload);
    return {
      message: translate[language].smsSent,
      data: { sms }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  send
};
