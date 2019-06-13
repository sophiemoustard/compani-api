'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  showById,
  remove
} = require('../controllers/taskController');
const { ADMIN, COACH, TECH } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-tasks',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            isDone: Joi.boolean()
          })
        },
        auth: {
          strategy: 'jwt',
          scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : [ADMIN, TECH, COACH]
        }
      },
      handler: create
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          },
          payload: Joi.object().keys({
            name: Joi.string().required()
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: update
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            name: Joi.string()
          })
        },
        auth: 'jwt'
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          },
        },
        auth: 'jwt'
      },
      handler: showById
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          },
        },
        auth: 'jwt'
      },
      handler: remove
    });
  }
};
