'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list //, create, list, show, update, remove, getPresentation, refreshToken
} = require('../controllers/Ogust/employeeController');

exports.plugin = {
  name: 'routes-ogust',
  register: async (server) => {
    // Get all employees
    server.route({
      method: 'GET',
      path: '/employees',
      options: {
        validate: {
          headers: { 'x-ogust-token': Joi.string().required() },
          query: {
            status: Joi.string().default('A'),
            nature: Joi.string(),
            mobile_phone: Joi.number(),
            sector: Joi.string(),
            nbperpage: Joi.number().default(50),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: list
    });
  }
};
