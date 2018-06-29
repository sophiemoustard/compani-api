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
            mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/).required(),
            sector: Joi.string().required(),
            managerId: Joi.objectId().required(),
          })
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach']
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
