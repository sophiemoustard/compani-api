'use strict';

const Joi = require('joi');
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
            userEmail: Joi.string().email().required(),
          }),
        },
      },
      handler: createActivationCode,
    });

    server.route({
      method: 'GET',
      path: '/{code}',
      options: {
        validate: {
          params: Joi.object().keys({
            code: Joi.string().length(4).required(),
          }),
        },
        auth: false,
      },
      handler: checkActivationCode,
    });
  },
};
