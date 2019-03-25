'use-strict';

const Joi = require('joi');
const {
  getDraftBills,
} = require('../controllers/billsController');

exports.plugin = {
  name: 'routes-bill',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/drafts',
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          query: {
            endDate: Joi.date().required(),
            startDate: Joi.date(),
          },
        },
      },
      handler: getDraftBills,
    });
  },
};
