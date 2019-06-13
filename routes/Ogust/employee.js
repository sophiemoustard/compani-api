'use strict';

const Joi = require('joi');

const { getEmployeeSalaries } = require('../../controllers/Ogust/employeeController');

exports.plugin = {
  name: 'routes-ogust-employees',
  register: async (server) => {
    // Get employee salaries
    server.route({
      method: 'GET',
      path: '/{id}/salaries',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: [Joi.number(), Joi.string()] },
          query: {
            nbperpage: Joi.number().default(24),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getEmployeeSalaries
    });
  },
};
