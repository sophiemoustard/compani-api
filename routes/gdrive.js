'use strict';

const Joi = require('joi');
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
          params: { id: Joi.string() }
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
          params: { id: Joi.string() }
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
          params: { id: Joi.string() }
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV ? ['right2:write'] : ['Admin', 'Tech', 'Coach', 'Auxiliaire']
        }
      }
    });

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
