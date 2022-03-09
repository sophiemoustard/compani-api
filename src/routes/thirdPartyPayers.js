'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authorizeThirdPartyPayersCreation,
  authorizeThirdPartyPayersUpdate,
  authorizeThirdPartyPayerDeletion,
} = require('./preHandlers/thirdPartyPayers');
const {
  create,
  list,
  updateById,
  removeById,
} = require('../controllers/thirdPartyPayerController');
const { BILLING_DIRECT, BILLING_INDIRECT } = require('../helpers/constants');
const { addressValidation, isNotEmpty } = require('./validations/utils');
const { TELETRANSMISSION_TYPES } = require('../models/ThirdPartyPayer');

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
            address: addressValidation,
            email: Joi.string().email(),
            unitTTCRate: Joi.number(),
            billingMode: Joi.string().valid(BILLING_DIRECT, BILLING_INDIRECT).required(),
            isApa: Joi.boolean().required(),
            teletransmissionId: Joi.string(),
          }),
        },
        pre: [{ method: authorizeThirdPartyPayersCreation }],
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
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            name: Joi.string().required(),
            address: addressValidation.default({}),
            email: Joi.string().email().default(''),
            unitTTCRate: Joi.number().default(0),
            billingMode: Joi.string().valid(BILLING_DIRECT, BILLING_INDIRECT).required(),
            isApa: Joi.boolean().required(),
            teletransmissionId: Joi.string().default(''),
            teletransmissionType: Joi.string().valid(...TELETRANSMISSION_TYPES)
              .when('teletransmissionId', { is: Joi.exist().empty(''), then: Joi.required() }),
            companyCode: Joi.string().when('teletransmissionId', { is: isNotEmpty, then: Joi.required() }),
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
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeThirdPartyPayerDeletion }],
      },
    });
  },
};
