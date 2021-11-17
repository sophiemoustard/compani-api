const Joi = require('joi');
const { authorizeCustomerAbsenceGet } = require('./preHandlers/customerAbsences');
const { list } = require('../controllers/customerAbsenceController');
const { objectIdOrArray } = require('./validations/utils');

exports.plugin = {
  name: 'routes-customer-absences',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object({
            customer: objectIdOrArray.required(),
            startDate: Joi.date().required(),
            endDate: Joi.date().greater(Joi.ref('startDate')).required(),
          }),
        },
        pre: [{ method: authorizeCustomerAbsenceGet }],
      },
      handler: list,
    });
  },
};
