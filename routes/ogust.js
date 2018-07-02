'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { getOgustToken } = require('../controllers/Ogust/tokenController');
const {
  list, getAllBySector, getById, getEmployeeCustomers, getEmployeeServices, getEmployeeSalaries, create, updateById
} = require('../controllers/Ogust/employeeController');

exports.plugin = {
  name: 'routes-ogust',
  register: async (server) => {
  // Get Ogust token
    server.route({
      method: 'GET',
      path: '/token',
      options: {
        auth: 'jwt'
      },
      handler: getOgustToken
    });
    // Get all employees
    server.route({
      method: 'GET',
      path: '/employees',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
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
    // Get employee by id
    server.route({
      method: 'GET',
      path: '/employees/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() }
        },
        auth: false
      },
      handler: getById
    });
    // Get all employees by sector
    server.route({
      method: 'GET',
      path: '/employees/sector/{sector}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { sector: Joi.string() },
          query: {
            status: Joi.string().default('A'),
            nature: Joi.string().default('S'),
            nbperpage: Joi.number().default(50),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getAllBySector
    });
    // Get employee services
    server.route({
      method: 'GET',
      path: '/employees/{id}/services',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            idCustomer: Joi.string(),
            isRange: Joi.string().default('false'),
            isDate: Joi.string().default('false'),
            slotToSub: Joi.number(),
            slotToAdd: Joi.number(),
            intervalType: Joi.string(),
            startDate: Joi.number(),
            endDate: Joi.number(),
            status: Joi.string().default('@!=|N'),
            type: Joi.string().default('I'),
            nbperpage: Joi.number().default(100),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getEmployeeServices
    });
    // Get employee customers
    server.route({
      method: 'GET',
      path: '/employees/{id}/customers',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            isRange: Joi.string().default('true'),
            isDate: Joi.string().default('false'),
            slotToSub: Joi.number().default(2),
            slotToAdd: Joi.number().default(2),
            intervalType: Joi.string().default('week'),
            startDate: Joi.number(),
            endDate: Joi.number(),
            status: Joi.string().default('@!=|N'),
            type: Joi.string().default('I'),
            nbperpage: Joi.number().default(500),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getEmployeeCustomers
    });
    // Get employee salaries
    server.route({
      method: 'GET',
      path: '/employees/{id}/salaries',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
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
      path: '/employees',
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
            manager: Joi.string().default('232220179')
          }).required()
        },
        auth: false
      },
      handler: create
    });
    // Update employee by id
    server.route({
      method: 'PUT',
      path: '/employees/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          payload: Joi.object().keys({
            title: Joi.string(),
            last_name: Joi.string(),
            first_name: Joi.string(),
            email: Joi.string().email(),
            sector: Joi.string(),
            mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/),
            picture: Joi.string(),
            nature: Joi.string(),
            status: Joi.string(),
            method_of_payment: Joi.string(),
            manager: Joi.string()
          })
        },
        auth: false
      },
      handler: updateById
    });
  },
};
