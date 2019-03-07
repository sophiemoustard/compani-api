'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  create,
  update,
  remove
} = require('../controllers/serviceController');

exports.plugin = {
  name: 'routes-services',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: Joi.object().keys({
            company: Joi.objectId().required(),
            versions: Joi.array().items({
              defaultUnitAmount: Joi.number().required(),
              eveningSurcharge: Joi.number().allow('', null),
              holidaySurcharge: Joi.number().allow('', null),
              name: Joi.string().required(),
              vat: Joi.number().required(),
            }),
            nature: Joi.string().required(),
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
          query: { company: Joi.objectId() }
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
            startDate: Joi.date().required(),
            defaultUnitAmount: Joi.number(),
            eveningSurcharge: Joi.number().allow('', null),
            holidaySurcharge: Joi.number().allow('', null),
            name: Joi.string(),
            vat: Joi.number(),
          })
        },
      },
    });
  }
};
