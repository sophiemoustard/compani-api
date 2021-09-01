'use strict';

const Joi = require('joi');
const { create, list } = require('../controllers/billingItemController');
const { BILLING_ITEM_TYPES } = require('../models/BillingItem');
const { authorizeBillingItemCreation } = require('./preHandlers/billingItems');

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
      },
      handler: list,
    });
  },
};
