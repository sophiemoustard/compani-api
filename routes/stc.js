'use-strict';

const Joi = require('joi');

const { getDraftStcList } = require('../controllers/stcController');

exports.plugin = {
  name: 'routes-stc',
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
      handler: getDraftStcList,
    });
  },
};
