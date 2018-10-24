
'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  show,
  remove
} = require('../controllers/companyController');

exports.plugin = {
  name: 'routes-companies',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            rhConfig: Joi.object().keys({
              providerContracts: {
                grossHourlyRate: Joi.number()
              },
              agentContracts: {
                grossHourlyRate: Joi.number()
              },
              phoneSubRefunding: Joi.number(),
              transportSubs: Joi.array().items({
                department: Joi.string(),
                price: Joi.number()
              }),
              contractTemplate: {
                id: Joi.string(),
                link: Joi.string()
              }
            })
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
            name: Joi.string(),
            rhConfig: Joi.object().keys({
              providerContracts: {
                grossHourlyRate: Joi.number()
              },
              agentContracts: {
                grossHourlyRate: Joi.number()
              },
              phoneSubRefunding: Joi.number(),
              transportSubs: Joi.array().items({
                department: Joi.string(),
                price: Joi.number()
              }),
              contractTemplate: {
                id: Joi.string(),
                link: Joi.string()
              }
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
            name: Joi.string(),
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
