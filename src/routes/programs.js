'use-strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create, getById, update, addStep, uploadImage } = require('../controllers/programController');
const { STEP_TYPES } = require('../models/Step');

exports.plugin = {
  name: 'routes-programs',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['programs:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['programs:read'] },
      },
      handler: getById,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            name: Joi.string(),
            learningGoals: Joi.string(),
            image: Joi.object().keys({
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null),
            }),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/step',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ title: Joi.string().required(), type: Joi.string().required().valid(...STEP_TYPES) }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: addStep,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/cloudinary/upload',
      handler: uploadImage,
      options: {
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        validate: {
          payload: Joi.object({
            fileName: Joi.string().required(),
            file: Joi.any().required(),
          }),
          params: Joi.object({
            _id: Joi.objectId().required(),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
    });
  },
};
