'use strict';

const Joi = require('joi');
const { send } = require('../controllers/smsController');
const { authorizeSendSms } = require('./preHandlers/sms');
const { SMS_TAGS } = require('../helpers/constants');

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
            recipient: Joi.string().required(),
            content: Joi.string().required(),
            tag: Joi.string().required().valid(...SMS_TAGS),
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
