'use strict';

const Joi = require('joi');
const { create, list, remove } = require('../controllers/billingItemController');
const { BILLING_ITEM_TYPES } = require('../models/BillingItem');
const { authorizeBillingItemCreation, authorizeBillingItemDeletion } = require('./preHandlers/billingItems');

exports.plugin = {
  name: 'routes-billing-items',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            type: Joi.string().required().valid(...BILLING_ITEM_TYPES),
            defaultUnitAmount: Joi.number().required(),
            vat: Joi.number().required(),
          }).required(),
        },
        pre: [{ method: authorizeBillingItemCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:read'] },
        validate: {
          query: Joi.object({
            type: Joi.string().valid(...BILLING_ITEM_TYPES),
          }),
        },
      },
      handler: list,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeBillingItemDeletion }],
      },
      handler: remove,
    });
  },
};
