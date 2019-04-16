'use strict';

const Joi = require('joi');

const {
  list,
  getById,
  getEmployeeSalaries,
  create,
} = require('../../controllers/Ogust/employeeController');

exports.plugin = {
  name: 'routes-ogust-employees',
  register: async (server) => {
    // Get all employees
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: {
            status: Joi.string().default('A'),
            nature: Joi.string().default('S'),
            mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/),
            sector: Joi.string(),
            email: Joi.string().email(),
            nbperpage: Joi.number().default(100),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: list
    });
    // Get employee by id
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: [Joi.number(), Joi.string()] },
        },
        auth: false
      },
      handler: getById
    });
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
    // Create employee
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            title: Joi.string().required(),
            last_name: Joi.string().required(),
            first_name: Joi.string(),
            main_address: Joi.object().keys({
              line: Joi.string(),
              supplement: Joi.string(),
              zip: Joi.string(),
              city: Joi.string(),
              type: Joi.string().default('Adrpri'),
              country: Joi.string().default('FR')
            }).required(),
            email: Joi.string().email().required(),
            sector: Joi.string(),
            mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/),
            picture: Joi.string(),
            nature: Joi.string().default('S'),
            status: Joi.string().default('A'),
            method_of_payment: Joi.string().default('7268'),
            manager: Joi.string().default('232220179'),
            default_means_of_transport: Joi.string().default('C')
          }).required()
        },
        auth: false
      },
      handler: create
    });
  },
};
