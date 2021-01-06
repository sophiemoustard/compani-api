'use-strict';

const Joi = require('joi');
const { checkUpdate } = require('../controllers/versionController');

exports.plugin = {
  name: 'routes-version',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/check-update',
      options: {
        auth: false,
        validate: {
          query: Joi.object({
            apiVersion: Joi.string(),
            mobileVersion: Joi.string(),
          }).required(),
        },
      },
      handler: checkUpdate,
    });
  },
};
