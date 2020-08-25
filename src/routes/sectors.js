'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeSectorUpdate, authorizeSectorDeletion, getSector } = require('./preHandlers/sectors');
const {
  create,
  update,
  list,
  remove,
} = require('../controllers/sectorController');

exports.plugin = {
  name: 'routes-sectors',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          payload: Joi.object().keys({ name: Joi.string().required() }),
        },
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({ name: Joi.string() }),
        },
        pre: [
          { method: getSector, assign: 'sector' },
          { method: authorizeSectorUpdate },
        ],
      },
      handler: update,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: getSector, assign: 'sector' },
          { method: authorizeSectorDeletion },
        ],
      },
      handler: remove,
    });
  },
};
