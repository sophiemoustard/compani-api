'use-strict';

const Joi = require('joi');
const { shouldUpdate } = require('../controllers/versionController');

exports.plugin = {
  name: 'routes-version',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/should-update',
      options: {
        auth: false,
        validate: {
          query: Joi.object({
            apiVersion: Joi.string(),
            mobileVersion: Joi.string(),
          }).required(),
        },
      },
      handler: shouldUpdate,
    });
  },
};
