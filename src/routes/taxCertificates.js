'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { generateTaxCertificatePdf, list } = require('../controllers/taxCertificateController');
const {
  getTaxCertificate,
  authorizeGetTaxCertificatePdf,
  authorizeGetTaxCertificates,
} = require('./preHandlers/taxCertificates');

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
        pre: [
          { method: authorizeGetTaxCertificates },
        ],
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
        pre: [
          { method: getTaxCertificate, assign: 'taxCertificate' },
          { method: authorizeGetTaxCertificatePdf },
        ],
      },
      handler: generateTaxCertificatePdf,
    });
  },
};
