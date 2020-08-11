'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeAdministrativeDocumentDeletion } = require('./preHandlers/administrativeDocuments');
const { create, list, remove } = require('../controllers/administrativeDocumentController');
const { formDataPayload } = require('./validations/utils');

exports.plugin = {
  name: 'routes-administrative-documents',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['config:edit'] },
        payload: formDataPayload,
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            file: Joi.any().required(),
            mimeType: Joi.string().required(),
          }),
        },
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeAdministrativeDocumentDeletion }],
      },
      handler: remove,
    });
  },
};
