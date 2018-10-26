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
          params: { id: Joi.string() }
        },
        auth: {
          strategy: 'jwt'
        }
      }
    });

    // server.route({
    //   method: 'GET',
    //   path: '/file/{id}',
    //   handler: deleteFile,
    //   options: {
    //     validate: {
    //       params: { id: Joi.string() }
    //     },
    //     auth: {
    //       strategy: 'jwt'
    //     }
    //   }
    // });

    // server.route({
    //   method: 'POST',
    //   path: '/{_id}/cloudinary/uploadImage',
    //   handler: uploadImage,
    //   options: {
    //     validate: {
    //       params: { _id: Joi.objectId().required() }
    //     },
    //     payload: {
    //       output: 'stream',
    //       parse: true,
    //       allow: 'multipart/form-data',
    //       maxBytes: 5242880
    //     },
    //     auth: {
    //       strategy: 'jwt',
    //       // scope: process.env.NODE_ENV ? ['right2:write'] : ['Admin', 'Tech', 'Coach', 'Auxiliaire']
    //     }
    //   }
    // });
  }
};
