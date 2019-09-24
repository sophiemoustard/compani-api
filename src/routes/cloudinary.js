'use strict';

const Joi = require('joi');
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
          params: { id: Joi.string() }
        },
      },
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
          maxBytes: 5242880,
        },
      },
    });
  }
};
