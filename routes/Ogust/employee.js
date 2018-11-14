'use strict';

const Joi = require('joi');

const {
  list,
  getById,
  getEmployeeCustomers,
  getEmployeeServices,
  getEmployeeSalaries,
  create,
  updateById,
  removeById
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
          params: { id: [Joi.number(), Joi.string()] }
        },
        auth: false
      },
      handler: getById
    });
    // Get employee services
    server.route({
      method: 'GET',
      path: '/{id}/services',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: [Joi.number(), Joi.string()] },
          query: {
            idCustomer: [Joi.number(), Joi.string()],
            isRange: Joi.boolean().default(false),
            isDate: Joi.boolean().default(false),
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
      path: '/{id}/customers',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: [Joi.number(), Joi.string()] },
          query: {
            isRange: Joi.boolean().default(true),
            isDate: Joi.boolean().default(false),
            slotToSub: Joi.number().default(2),
            slotToAdd: Joi.number().default(2),
            intervalType: Joi.string().default('week'),
            startDate: Joi.string(),
            endDate: Joi.string(),
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
    // Update employee by id
    server.route({
      method: 'PUT',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: [Joi.number(), Joi.string()] },
          payload: Joi.object().keys({
            id_employee: [Joi.number(), Joi.string()],
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
            manager: Joi.string(),
            country_of_birth: Joi.string(),
            date_of_birth: Joi.string(),
            place_of_birth: Joi.string(),
            state_of_birth: Joi.number(),
            social_insurance_number: Joi.number(),
            nationality: Joi.string(),
            means_of_transport: Joi.string(),
            main_address: Joi.object().keys({
              line: Joi.string(),
              supplement: Joi.string(),
              zip: Joi.string(),
              city: Joi.string(),
              type: Joi.string().default('Adrpri'),
              country: Joi.string().default('FR')
            })
          })
        },
        auth: false
      },
      handler: updateById
    });

    server.route({
      method: 'DELETE',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: [Joi.number(), Joi.string()] }
        },
        auth: false
      },
      handler: removeById
    });
  },
};
