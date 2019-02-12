'use strict';

const Joi = require('joi');
const Boom = require('boom');
Joi.objectId = require('joi-objectid')(Joi);

const { deleteImage, uploadImage } = require('../controllers/cloudinaryController');

exports.plugin = {
  name: 'routes-cloudinary',
  register: async (server) => {
    server.route({
      method: 'DELETE',
      path: '/image/{id}',
      handler: deleteImage,
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
      path: '/image/upload',
      handler: uploadImage,
      options: {
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880
        },
        auth: {
          strategy: 'jwt',
        }
      }
    });
  }
};
