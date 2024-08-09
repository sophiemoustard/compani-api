'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { generateTaxCertificatePdf } = require('../controllers/taxCertificateController');
const {
  getTaxCertificate,
  authorizeGetTaxCertificatePdf,
} = require('./preHandlers/taxCertificates');

exports.plugin = {
  name: 'routes-taxcertificates',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{_id}/pdfs',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
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
