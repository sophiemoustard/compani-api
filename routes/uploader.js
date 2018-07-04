'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { uploadFile, uploadImage } = require('../controllers/uploaderController');

exports.plugin = {
  name: 'routes-upload',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/{_id}/drive/uploadFile',
      handler: uploadFile,
      options: {
        validate: {
          params: { _id: Joi.objectId().required() }
        },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach', 'Auxiliaire']
        }
      }
    });

    server.route({
      method: 'POST',
      path: '/{_id}/cloudinary/uploadImage',
      handler: uploadImage,
      options: {
        validate: {
          params: { _id: Joi.objectId().required() }
        },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach', 'Auxiliaire']
        }
      }
    });
  }
};
