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
            newUserId: Joi.objectId().required(),
            userEmail: Joi.string().email().required()
          })
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
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
          })
        },
        auth: false
      },
      handler: checkActivationCode
    });
  }
};
