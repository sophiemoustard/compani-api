'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  deleteFile,
  getFileById,
  generateDocxFromDrive,
  getList,
  uploadFile,
  downloadFile,
} = require('../../controllers/Google/driveController');
const { formDataPayload } = require('../validations/utils');

exports.plugin = {
  name: 'routes-gdrive',
  register: async (server) => {
    server.route({
      method: 'DELETE',
      path: '/file/{id}',
      handler: deleteFile,
      options: {
        validate: {
          params: Joi.object({ id: Joi.string() }),
        },
        auth: { strategy: 'jwt', mode: 'required' },
      },
    });

    server.route({
      method: 'GET',
      path: '/file/{id}',
      handler: getFileById,
      options: {
        validate: {
          params: Joi.object({ id: Joi.string() }),
        },
        auth: { strategy: 'jwt', mode: 'required' },
      },
    });

    server.route({
      method: 'GET',
      path: '/file/{id}/download',
      options: {
        validate: {
          params: Joi.object({ id: Joi.string() }),
        },
        auth: { strategy: 'jwt', mode: 'required' },
      },
      handler: downloadFile,
    });

    server.route({
      method: 'GET',
      path: '/list',
      handler: getList,
      options: {
        validate: {
          query: Joi.object({ folderId: Joi.string(), nextPageToken: Joi.string() }),
        },
        auth: {
          strategy: 'jwt',
        },
      },
    });

    server.route({
      method: 'POST',
      path: '/{id}/generatedocx',
      handler: generateDocxFromDrive,
      options: {
        validate: {
          params: Joi.object({ id: Joi.string() }),
        },
        auth: { strategy: 'jwt', mode: 'required' },
      },
    });

    server.route({
      method: 'POST',
      path: '/{id}/upload',
      handler: uploadFile,
      options: {
        payload: formDataPayload(),
        validate: {
          payload: Joi.object().keys({
            file: Joi.any().required(),
            fileName: Joi.string().required(),
            type: Joi.string().required(),
          }),
        },
        auth: { strategy: 'jwt', mode: 'required' },
      },
    });
  },
};
