'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { generateTaxCertificatePdf, list } = require('../controllers/taxCertificateController');

exports.plugin = {
  name: 'routes-taxcertificates',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: {
            customer: Joi.objectId().required(),
          },
        },
        auth: { scope: ['taxcertificates:read', 'customer-{query.customer}'] },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
        },
        auth: { scope: ['taxcertificates:read', 'customer-{query.customer}'] },
      },
      handler: generateTaxCertificatePdf,
    });
  },
};
