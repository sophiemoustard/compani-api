'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { list, listWithDetails } = require('../controllers/balanceController');
const { authorizeGetDetails } = require('./preHandlers/balances');

exports.plugin = {
  name: 'routes-balances',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['bills:read', 'customer-{query.customer}'] },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/details',
      options: {
        auth: { scope: ['bills:read', 'customer-{query.customer}'] },
        validate: {
          query: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            customer: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeGetDetails }],
      },
      handler: listWithDetails,
    });
  },
};
