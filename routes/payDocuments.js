'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { create, list, remove } = require('../controllers/payDocumentController');
const { PAY_DOCUMENT_NATURES } = require('../models/PayDocument');

exports.plugin = {
  name: 'routes-pay-documents',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
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
            payDoc: Joi.any().required(),
            nature: Joi.string().valid(PAY_DOCUMENT_NATURES).required(),
            'Content-Type': Joi.string().required(),
            driveFolderId: Joi.string().required(),
            user: Joi.objectId().required(),
          }),
        },
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({
            user: Joi.objectId(),
          }),
        },
      },
      handler: list,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({
            _id: Joi.objectId(),
          }),
        },
      },
      handler: remove,
    });
  },
};
