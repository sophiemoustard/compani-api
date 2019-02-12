'use strict';

const Joi = require('joi');
const Boom = require('boom');

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
          },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
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
          }).required(),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: send
    });
  }
};
