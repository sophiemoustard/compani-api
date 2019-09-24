'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  deleteFile,
  getFileById,
  generateDocxFromDrive,
  getList,
} = require('../../controllers/Google/driveController');

exports.plugin = {
  name: 'routes-gdrive',
  register: async (server) => {
    server.route({
      method: 'DELETE',
      path: '/file/{id}',
      handler: deleteFile,
      options: {
        validate: {
          params: { id: Joi.string() },
        },
        auth: {
          strategy: 'jwt',
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/file/{id}',
      handler: getFileById,
      options: {
        validate: {
          params: { id: Joi.string() },
        },
        auth: {
          strategy: 'jwt',
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/list',
      handler: getList,
      options: {
        validate: {
          query: {
            folderId: Joi.string(),
            nextPageToken: Joi.string(),
          },
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
          params: { id: Joi.string() },
        },
        auth: {
          strategy: 'jwt',
        },
      },
    });
  },
};
