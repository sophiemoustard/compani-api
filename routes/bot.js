'use strict';

const Joi = require('joi');
const Boom = require('boom');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authorize,
  getUserByParamId,
  showAll
} = require('../controllers/botController');

exports.plugin = {
  name: 'routes-bot',
  register: async (server) => {
    // Authenticate a user
    server.route({
      method: 'POST',
      path: '/authorize',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            password: Joi.string().required()
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
        auth: false
      },
      handler: authorize
    });

    server.route({
      method: 'GET',
      path: '/users',
      options: {
        auth: false
      },
      handler: showAll
    });

    server.route({
      method: 'GET',
      path: '/user/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() },
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
      handler: getUserByParamId
    });
  }
};
