'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list } = require('../controllers/internalHourController');

exports.plugin = {
  name: 'routes-internal-hours',
  register: async (server) => {
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
