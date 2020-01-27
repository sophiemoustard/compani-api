'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { generateTaxCertificatePdf, list, create, remove } = require('../controllers/taxCertificateController');
const {
  getTaxCertificate,
  authorizeGetTaxCertificatePdf,
  authorizeTaxCertificatesRead,
  authorizeTaxCertificateCreation,
} = require('./preHandlers/taxCertificates');
const { YEAR_VALIDATION } = require('../models/TaxCertificate');

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
          { method: authorizeTaxCertificatesRead },
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
        auth: { scope: ['taxcertificates:edit'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        validate: {
          payload: Joi.object({
            date: Joi.date().required(),
            year: Joi.string().regex(YEAR_VALIDATION).required(),
            fileName: Joi.string().required(),
            taxCertificate: Joi.any().required(),
            mimeType: Joi.string().required(),
            driveFolderId: Joi.string().required(),
            customer: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeTaxCertificateCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['taxcertificates:edit'] },
        validate: {
          params: Joi.object({
            _id: Joi.objectId().required(),
          }),
        },
        pre: [{ method: getTaxCertificate }],
      },
      handler: remove,
    });
  },
};
