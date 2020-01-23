'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { generateTaxCertificatePdf, list, create } = require('../controllers/taxCertificateController');
const {
  getTaxCertificate,
  authorizeGetTaxCertificatePdf,
  authorizeGetTaxCertificates,
  authorizeCreateTaxCertificates,
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

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['taxcertificates:create'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        validate: {
          payload: Joi.object({
            date: Joi.date(),
            fileName: Joi.string().required(),
            taxCertificate: Joi.any().required(),
            mimeType: Joi.string().required(),
            driveFolderId: Joi.string().required(),
            customer: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeCreateTaxCertificates }],
      },
      handler: create,
    });
  },
};
