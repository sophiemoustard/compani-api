'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { exportData } = require('../controllers/exportController');
const { SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-exports',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{type}/data',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            type: Joi.string().required().valid(SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION),
          },
        },
      },
      handler: exportData,
    });
  }
};
