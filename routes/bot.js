'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authorize,
  getUserByParamId,
  list,
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
          }).required()
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
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/user/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() }
        },
        auth: false
      },
      handler: getUserByParamId
    });
  }
};
