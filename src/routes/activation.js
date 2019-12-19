'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { authorizeActivationCodeCreate, authorizeActivationCodeGet } = require('./preHandlers/activationCode');
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
            user: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeActivationCodeCreate }],
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
        pre: [{ method: authorizeActivationCodeGet }],
      },
      handler: checkActivationCode,
    });
  },
};
