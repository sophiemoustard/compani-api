'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { create, list, remove } = require('../controllers/payDocumentController');
const { PAY_DOCUMENT_NATURES } = require('../models/PayDocument');
const {
  authorizePayDocumentCreation,
  authorizePayDocumentDeletion,
  authorizeGetPayDocuments,
} = require('./preHandlers/payDocuments');
const { formDataPayload } = require('./validations/utils');

exports.plugin = {
  name: 'routes-pay-documents',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['paydocuments:edit'] },
        payload: formDataPayload,
        validate: {
          payload: Joi.object({
            date: Joi.date(),
            fileName: Joi.string().required(),
            payDoc: Joi.any().required(),
            nature: Joi.string().valid(...PAY_DOCUMENT_NATURES).required(),
            mimeType: Joi.string().required(),
            driveFolderId: Joi.string().required(),
            user: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizePayDocumentCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['paydocuments:edit', 'user:read-{query.user}'] },
        validate: {
          query: Joi.object({ user: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeGetPayDocuments }],
      },
      handler: list,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['paydocuments:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizePayDocumentDeletion }],
      },
      handler: remove,
    });
  },
};
