'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  remove
} = require('../controllers/sectorController');

exports.plugin = {
  name: 'routes-sectors',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            company: Joi.objectId().required()
          })
        },
        auth: 'jwt'
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
            name: Joi.string(),
          })
        },
        auth: 'jwt'
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
            company: Joi.objectId()
          })
        },
        auth: 'jwt'
      },
      handler: list
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
