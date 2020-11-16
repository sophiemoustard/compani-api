'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { checkProgramExists } = require('./preHandlers/programs');
const {
  list,
  listELearning,
  create,
  getById,
  getProgramForUser,
  update,
  uploadImage,
  addSubProgram,
} = require('../controllers/programController');
const { formDataPayload } = require('./validations/utils');

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
      method: 'GET',
      path: '/e-learning',
      options: {
        auth: { mode: 'required' },
      },
      handler: listELearning,
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
        pre: [{ method: checkProgramExists }],
      },
      handler: getById,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/user',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { mode: 'required' },
        pre: [{ method: checkProgramExists }],
      },
      handler: getProgramForUser,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            name: Joi.string(),
            description: Joi.string(),
            image: Joi.object().keys({
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null),
            }),
          }).min(1),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: checkProgramExists }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/subprograms',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ name: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: checkProgramExists }],
      },
      handler: addSubProgram,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/upload',
      handler: uploadImage,
      options: {
        payload: formDataPayload,
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
        pre: [{ method: checkProgramExists }],
      },
    });
  },
};
