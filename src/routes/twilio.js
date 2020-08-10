'use strict';

const Joi = require('joi');
const { send } = require('../controllers/twilioController');
const { authorizeSendSms } = require('./preHandlers/twilio');

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
  },
};
