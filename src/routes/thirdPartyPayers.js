'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { authorizeThirdPartyPayersUpdate } = require('./preHandlers/thirdPartyPayers');
const {
  create,
  list,
  updateById,
  removeById,
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
        auth: { scope: ['config:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            address: Joi.object().keys({
              street: Joi.string().required(),
              fullAddress: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required(),
              location: Joi.object().keys({
                type: Joi.string().required(),
                coordinates: Joi.array().length(2).required(),
              }).required(),
            }),
            email: Joi.string().email(),
            unitTTCRate: Joi.number(),
            billingMode: Joi.string().valid(BILLING_DIRECT, BILLING_INDIRECT).required(),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['config:read'] },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: updateById,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string(),
            address: Joi.object().keys({
              street: Joi.string().required(),
              fullAddress: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required(),
              location: Joi.object().keys({
                type: Joi.string().required(),
                coordinates: Joi.array().length(2).required(),
              }).required(),
            }).default({}),
            email: Joi.string().email().allow(null, ''),
            unitTTCRate: Joi.number().default(0),
            billingMode: Joi.string().valid(BILLING_DIRECT, BILLING_INDIRECT).required(),
          }),
        },
        pre: [{ method: authorizeThirdPartyPayersUpdate }],
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: removeById,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
        },
        pre: [{ method: authorizeThirdPartyPayersUpdate }],
      },
    });
  },
};
