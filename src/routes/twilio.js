'use strict';

const Joi = require('joi');

const { send } = require('../controllers/twilioController');

exports.plugin = {
  name: 'routes-twilio',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            to: Joi.string().required(),
            from: Joi.string().required(),
            body: Joi.string().required(),
          }).required(),
        },
      },
      handler: send,
    });
  },
};
