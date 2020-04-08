'use strict';

const Joi = require('@hapi/joi');
const { send, sendCompaniSMS } = require('../controllers/twilioController');
const { authorizeSendSms, authorizeSendSmsFromCompani } = require('./preHandlers/twilio');

exports.plugin = {
  name: 'routes-twilio',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['sms:send'] },
        validate: {
          payload: Joi.object().keys({
            to: Joi.string().required(),
            body: Joi.string().required(),
          }).required(),
        },
        pre: [
          { method: authorizeSendSms },
        ],
      },
      handler: send,
    });
    server.route({
      method: 'POST',
      path: '/compani',
      options: {
        auth: { scope: ['sms:compani:send'] },
        validate: {
          payload: Joi.object().keys({
            to: Joi.string().required(),
            body: Joi.string().required(),
          }).required(),
        },
        pre: [
          { method: authorizeSendSmsFromCompani },
        ],
      },
      handler: sendCompaniSMS,
    });
  },
};
