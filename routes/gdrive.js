'use strict';

const Joi = require('joi');
const Boom = require('boom');
Joi.objectId = require('joi-objectid')(Joi);

const { deleteFile, getFileById, generateDocxFromDrive } = require('../controllers/googleDriveController');

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
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt'
        }
      }
    });

    server.route({
      method: 'GET',
      path: '/file/{id}',
      handler: getFileById,
      options: {
        validate: {
          params: { id: Joi.string() },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt'
        }
      }
    });

    server.route({
      method: 'POST',
      path: '/{id}/generatedocx',
      handler: generateDocxFromDrive,
      options: {
        validate: {
          params: { id: Joi.string() },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
        }
      }
    });
  }
};
