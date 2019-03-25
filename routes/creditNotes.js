'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  update,
  remove,
  getById
} = require('../controllers/creditNoteController');

exports.plugin = {
  name: 'routes-credit-notes',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: Joi.object().keys({
            number: Joi.number().required(),
            startDate: Joi.date(),
            endDate: Joi.date(),
            customer: Joi.objectId().required(),
            thirdPartyPayer: Joi.objectId().required(),
            exclTaxes: Joi.number().required(),
            inclTaxes: Joi.number().required(),
            events: Joi.array().items({ _id: Joi.objectId() }),
            subscription: Joi.object().keys({
              service: Joi.string(),
              unitTTCRate: Joi.number(),
              estimatedWeeklyVolume: Joi.number(),
              evenings: Joi.number(),
              sundays: Joi.number(),
              startDate: Joi.date(),
            }),
          })
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          query: {
            // startDate: Joi.date().required(),
            // endDate: Joi.date().required()
          }
        }
      },
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      handler: getById,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            endDate: Joi.objectId().required()
          }
        }
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          }
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            number: Joi.number().required(),
            startDate: Joi.date(),
            endDate: Joi.date(),
            customer: Joi.objectId().required(),
            thirdPartyPayer: Joi.objectId().required(),
            exclTaxes: Joi.number().required(),
            inclTaxes: Joi.number().required(),
            events: Joi.array().items({ _id: Joi.objectId() }),
            subscription: Joi.object().keys({
              service: Joi.string(),
              unitTTCRate: Joi.number(),
              estimatedWeeklyVolume: Joi.number(),
              evenings: Joi.number(),
              sundays: Joi.number(),
              startDate: Joi.date(),
            }),
          })
        },
      },
    });
  }
};
