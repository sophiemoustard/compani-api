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
      path: '/sendWelcome',
      options: {
        validate: {
          payload: Joi.object().keys({
            receiver: Joi.object().keys({
              email: Joi.string().email().required(),
              password: Joi.string().required(),
            }).required(),
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
