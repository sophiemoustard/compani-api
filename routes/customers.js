'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  show,
  remove
} = require('../controllers/customerController');

exports.plugin = {
  name: 'routes-customers',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            firstname: Joi.string().required(),
            lastname: Joi.string().required(),
            contact: Joi.object().keys({
              ogustAddressId: Joi.string().required(),
              address: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required()
            }).required(),
            customer_id: Joi.string(),
            title: Joi.string(),
            isActive: Joi.boolean().default(true)
          })
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
            _id: Joi.objectId(),
            firstname: Joi.string(),
            lastname: Joi.string(),
            email: Joi.string().email(),
            phone: Joi.string(),
            contact: Joi.object().keys({
              ogustAddressId: Joi.string(),
              address: Joi.string(),
              additionalAddress: Joi.string(),
              zipCode: Joi.string(),
              city: Joi.string(),
              doorCode: Joi.string(),
              intercomCode: Joi.string()
            }),
            followUp: Joi.object().keys({
              pathology: Joi.string(),
              comments: Joi.string(),
              details: Joi.string(),
              misc: Joi.string(),
              referent: Joi.string()
            })
          })
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
            firstname: Joi.string(),
            lastname: Joi.string()
          })
        },
        auth: 'jwt'
      },
      handler: list
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
      handler: show
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
