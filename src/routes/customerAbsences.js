const Joi = require('joi');
const { authorizeCustomerAbsenceGet } = require('./preHandlers/customerAbsences');
const { list } = require('../controllers/customerAbsenceController');

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
            customer: Joi.objectId(),
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
          }),
        },
        pre: [{ method: authorizeCustomerAbsenceGet }],
      },
      handler: list,
    });
  },
};
