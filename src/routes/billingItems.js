'use strict';

const Joi = require('joi');
const { create } = require('../controllers/billingItemController');
const { BILLING_ITEM_TYPES } = require('../models/BillingItem');

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
            vat: Joi.number(),
          }).required(),
        },
      },
      handler: create,
    });
  },
};
