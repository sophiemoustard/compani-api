'use strict';

const Joi = require('joi');
const { list } = require('../controllers/helperController');

exports.plugin = {
  name: 'routes-helpers',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object({ customer: Joi.objectId() }).required(),
        },
        auth: { scope: ['helpers:list'] },
      },
      handler: list,
    });
  },
};
