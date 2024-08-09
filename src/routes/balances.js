'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { list } = require('../controllers/balanceController');

exports.plugin = {
  name: 'routes-balances',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['bills:read'] },
      },
      handler: list,
    });
  },
};
