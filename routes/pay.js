'use-strict';

const Joi = require('joi');

const { draftPayList } = require('../controllers/payController');

exports.plugin = {
  name: 'routes-pay',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/draft',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          query: {
            endDate: Joi.date(),
            startDate: Joi.date(),
          },
        },
      },
      handler: draftPayList,
    });
  },
};
