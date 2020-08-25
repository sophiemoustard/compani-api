'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { deleteImage } = require('../controllers/cloudinaryController');

exports.plugin = {
  name: 'routes-cloudinary',
  register: async (server) => {
    server.route({
      method: 'DELETE',
      path: '/image/{id}',
      handler: deleteImage,
      options: {
        validate: {
          params: Joi.object({ id: Joi.string() }),
        },
      },
    });
  },
};
