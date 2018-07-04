'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { getEvents } = require('../controllers/calendarController');

exports.plugin = {
  name: 'routes-calendar',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/events',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: Joi.object().keys({
            id_employee: Joi.string(),
            id_customer: Joi.string(),
            isDate: Joi.boolean(),
            startDate: Joi.number().required(),
            endDate: Joi.number().required()
          }).xor('id_employee', 'id_customer')
        },
        auth: false
      },
      handler: getEvents
    });
  }
};
