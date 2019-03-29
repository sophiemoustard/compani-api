'use-strict';

const Joi = require('joi');
const {
  draftBillsList,
} = require('../controllers/billsController');
const { MONTH, TWO_WEEKS } = require('../helpers/constants');

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
            startDate: Joi.date().required(),
            billingPeriod: Joi.string().valid([MONTH, TWO_WEEKS]).required(),
          },
        },
      },
      handler: draftBillsList,
    });
  },
};
