'use strict';

const Joi = require('joi');
const { send } = require('../controllers/smsController');
const { authorizeSendSms } = require('./preHandlers/sms');

exports.plugin = {
  name: 'routes-sms',
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
