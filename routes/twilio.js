'use strict';

const Joi = require('joi');

const { list, send } = require('../controllers/twilioController');

exports.plugin = {
  name: 'routes-twilio',
  register: async (server) => {
    // Get SMS
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: {
            limit: Joi.number()
          }
        },
        auth: {
          strategy: 'jwt',
          // scope: ['Admin', 'Tech', 'Coach']
        }
      },
      handler: list
    });
    // Send SMS
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            to: Joi.string().required(),
            from: Joi.string().default('Alenvi'),
            body: Joi.string().required()
          }).required()
        },
        auth: {
          strategy: 'jwt',
          // scope: ['Admin', 'Tech', 'Coach']
        }
      },
      handler: send
    });
  }
};
