'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  showAll,
  showById,
  remove
} = require('../controllers/rightController');

exports.plugin = {
  name: 'routes-rights',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            name: Joi.string(),
            description: Joi.string(),
            permission: Joi.string().required()
          })
        },
        auth: {
          strategy: 'jwt',
          scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
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
            _id: Joi.objectId()
          },
          payload: Joi.object().keys({
            name: Joi.string(),
            description: Joi.string(),
            permission: Joi.string()
          }).or('name', 'description', 'permission')
        },
        auth: {
          strategy: 'jwt',
          scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
        }
      },
      handler: update
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            name: Joi.string(),
            permission: Joi.string()
          })
        },
        auth: 'jwt'
      },
      handler: showAll
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          }
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
          }
        },
        auth: 'jwt'
      },
      handler: remove
    });
  }
};
