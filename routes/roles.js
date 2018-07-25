'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  showAll,
  showById,
  remove
} = require('../controllers/roleController');

exports.plugin = {
  name: 'routes-roles',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().default('Invité'),
            rights: Joi.array(),
          }).or('name', 'rights')
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
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
            name: Joi.string().optional(),
            rights: Joi.array().invalid([]).items(Joi.object().keys({
              right_id: Joi.objectId().required(),
              hasAccess: Joi.boolean().required(),
              rolesConcerned: Joi.array().items(Joi.object().keys({
                role_id: Joi.objectId(),
                name: Joi.string()
              }))
            })).optional()
          }).required()
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
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
            name: Joi.string()
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
