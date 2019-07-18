'use strict';

const Joi = require('joi');
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
          })
        },
      },
      handler: sendWelcome,
    });

    server.route({
      method: 'POST',
      path: '/sendAuxiliaryWelcome',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required()
          })
        },
      },
      handler: sendAuxiliaryWelcome,
    });
  }
};
