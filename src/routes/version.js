'use-strict';

const Joi = require('joi');
const { shouldUpdate } = require('../controllers/versionController');
const { ERP, FORMATION } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-version',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/check-update',
      options: {
        auth: false,
        validate: {
          query: Joi.object({ apiVersion: Joi.string() }).required(),
        },
      },
      handler: shouldUpdate,
    });
    server.route({
      method: 'GET',
      path: '/should-update',
      options: {
        auth: false,
        validate: {
          query: Joi.object({
            mobileVersion: Joi.string().required(),
            appName: Joi.string().valid(ERP, FORMATION),
          }).required(),
        },
      },
      handler: shouldUpdate,
    });
  },
};
