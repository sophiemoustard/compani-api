'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { sendWelcome } = require('../controllers/emailController');
const { authorizeSendEmail } = require('./preHandlers/email');
const { HELPER, TRAINER, COACH, CLIENT_ADMIN } = require('../helpers/constants');

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
            type: Joi.string().valid(HELPER, TRAINER, COACH, CLIENT_ADMIN).required(),
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
