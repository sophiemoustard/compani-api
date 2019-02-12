'use strict';

const Joi = require('joi');
const Boom = require('boom');
Joi.objectId = require('joi-objectid')(Joi);

const {
  sendWelcome,
  sendAuxiliaryWelcome
} = require('../controllers/emailController');

exports.plugin = {
  name: 'routes-email',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/sendWelcome',
      options: {
        validate: {
          payload: Joi.object().keys({
            sender: Joi.object().keys({
              email: Joi.string().email().required()
            }),
            receiver: Joi.object().keys({
              email: Joi.string().email().required(),
              password: Joi.string().required()
            }).required(),
          }),
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
      handler: sendWelcome
    });

    server.route({
      method: 'POST',
      path: '/sendAuxiliaryWelcome',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required()
          }),
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
      handler: sendAuxiliaryWelcome
    });
  }
};
