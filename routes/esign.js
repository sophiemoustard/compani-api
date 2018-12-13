'use strict';

const Joi = require('joi');

const { generateCustomerSignatureRequest } = require('../controllers/eSignController');

exports.plugin = {
  name: 'routes-esign',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/customers',
      options: {
        validate: {
          payload: {
            type: Joi.string().valid('sepa', 'devis').required(),
            file: Joi.string().required(),
            customer: {
              name: Joi.string().required(),
              email: Joi.string().email().required()
            }
          }
        },
        auth: {
          strategy: 'jwt'
        }
      },
      handler: generateCustomerSignatureRequest
    });
  }
};
