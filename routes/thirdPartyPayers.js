'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  updateById,
  removeById
} = require('../controllers/thirdPartyPayerController');
const { BILLING_DIRECT, BILLING_INDIRECT } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-thirdpartypayers',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['rhConfig:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            address: Joi.object().keys({
              street: Joi.string(),
              fullAddress: Joi.string(),
              zipCode: Joi.string(),
              city: Joi.string(),
            }),
            email: Joi.string().email(),
            unitTTCRate: Joi.number(),
            billingMode: Joi.string().valid(BILLING_DIRECT, BILLING_INDIRECT),
            company: Joi.objectId().required(),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['rhConfig:edit'] },
        validate: {
          query: {
            company: Joi.objectId(),
          },
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: updateById,
      options: {
        auth: { scope: ['rhConfig:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string(),
            address: Joi.object().keys({
              street: Joi.string().allow(null, ''),
              fullAddress: Joi.string().allow(null, ''),
              zipCode: Joi.string().allow(null, ''),
              city: Joi.string().allow(null, ''),
            }),
            email: Joi.string().email().allow(null, ''),
            unitTTCRate: Joi.number().default(0),
            billingMode: Joi.string().valid(BILLING_DIRECT, BILLING_INDIRECT),
          }),
        },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: removeById,
      options: {
        auth: { scope: ['rhConfig:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
        },
      },
    });
  }
};
