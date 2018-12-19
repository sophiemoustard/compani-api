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
            fileId: Joi.string().required(),
            customer: Joi.object().keys({
              name: Joi.string().required(),
              email: Joi.string().email().required()
            }).required(),
            fields: Joi.object().required(),
            redirect: Joi.string(),
            redirectDecline: Joi.string()
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
