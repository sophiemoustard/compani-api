'use strict';

const Joi = require('joi');
const Boom = require('boom');
Joi.objectId = require('joi-objectid')(Joi);

const { createActivationCode, checkActivationCode } = require('../controllers/activationCodeController');

exports.plugin = {
  name: 'routes-activation',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            code: Joi.string().min(4).max(4),
            newUserId: Joi.objectId().required(),
            userEmail: Joi.string().email().required()
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
      handler: createActivationCode
    });

    server.route({
      method: 'GET',
      path: '/{code}',
      options: {
        validate: {
          params: Joi.object().keys({
            code: Joi.string().length(4).required()
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
        auth: false
      },
      handler: checkActivationCode
    });
  }
};
