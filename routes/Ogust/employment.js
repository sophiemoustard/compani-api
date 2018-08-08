'use strict';

const Joi = require('joi');

const {
  list,
  getById,
  create,
  // updateById
} = require('../../controllers/Ogust/employmentController');

exports.plugin = {
  name: 'routes-ogust-employment',
  register: async (server) => {
    // Get all employment contracts
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: {
            status: Joi.string(),
            type: Joi.string(),
            id_employee: Joi.string(),
            nbperpage: Joi.number().default(50)
          }
        },
        auth: false
      },
      handler: list
    });
    // Get employment contract by id
    server.route({
      method: 'GET',
      path: '/{id}',
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
    // Create employment contract
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            id_employee: Joi.string().required(),
            creation_date: Joi.string().required(),
            start_date: Joi.string().required(),
            motive_entry: Joi.string().default('001'),
            collective_convention: Joi.string().default('0005'),
            nature: Joi.string().default('00201'),
            nature_2: Joi.string().default('1:0:0:0'),
            type: Joi.string().required(),
            regime: Joi.string().default('50'),
            specificity: Joi.string().default('0'),
            description: Joi.string().default("Auxiliaire d'envie"),
            social_category: Joi.string().default('015'),
            contract_hours: Joi.string().required(),
            contractual_salary: Joi.string(),
            due: Joi.string().default('1')
          }).required()
        },
        auth: false
      },
      handler: create
    });
    // Update employee by id
    // server.route({
    //   method: 'PUT',
    //   path: '/{id}',
    //   options: {
    //     validate: {
    //       headers: Joi.object().keys({
    //         'x-ogust-token': Joi.string().required()
    //       }).options({ allowUnknown: true }),
    //       params: { id: Joi.string() },
    //       payload: Joi.object().keys({
    //         id_employee: Joi.string(),
    //         title: Joi.string(),
    //         last_name: Joi.string(),
    //         first_name: Joi.string(),
    //         email: Joi.string().email(),
    //         sector: Joi.string(),
    //         mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/),
    //         picture: Joi.string(),
    //         nature: Joi.string(),
    //         status: Joi.string(),
    //         method_of_payment: Joi.string(),
    //         manager: Joi.string(),
    //         country_of_birth: Joi.string(),
    //         date_of_birth: Joi.string(),
    //         place_of_birth: Joi.string(),
    //         state_of_birth: Joi.number(),
    //         social_insurance_number: Joi.number()
    //       })
    //     },
    //     auth: false
    //   },
    //   handler: updateById
    // });
  },
};
