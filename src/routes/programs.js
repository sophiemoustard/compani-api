'use-strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create, getById, update, addModule } = require('../controllers/programController');

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
          params: Joi.object({ _id: Joi.objectId() }),
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
          params: Joi.object({ _id: Joi.objectId() }),
          payload: Joi.object({
            name: Joi.string(),
            learningGoals: Joi.string(),
          }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: update,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/module',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId() }),
          payload: Joi.object({ title: Joi.string().required() }),
        },
        auth: { scope: ['programs:edit'] },
      },
      handler: addModule,
    });
  },
};
