'use strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);

const { sendWelcome } = require('../controllers/emailController');
const { authorizeSendEmail } = require('./preHandlers/email');

exports.plugin = {
  name: 'routes-email',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/send-welcome',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            type: Joi.string().required(),
          }),
        },
        pre: [
          { method: authorizeSendEmail },
        ],
      },
      handler: sendWelcome,
    });
  },
};
