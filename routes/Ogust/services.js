'use strict';

const Joi = require('joi');

const {
  list,
  getById,
  updateById,
  create
} = require('../../controllers/Ogust/serviceController');

exports.plugin = {
  name: 'routes-ogust-services',
  register: async (server) => {
    // Get all services
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: {
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
      handler: list
    });
    // Get service by id
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            status: Joi.string().default('@!=|N'),
            type: Joi.string().default('I')
          }
        },
        auth: false
      },
      handler: getById
    });
    // Update service by id
    server.route({
      method: 'PUT',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          payload: Joi.object().keys({
            start_date: Joi.string(),
            end_date: Joi.string(),
            status: Joi.string(),
            id_employee: [Joi.string(), Joi.number()]
          })
        },
        auth: false
      },
      handler: updateById
    });
    // Create service
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            start_date: Joi.string(),
            end_date: Joi.string(),
            id_employee: [Joi.string(), Joi.number()],
            type: Joi.string(),
            id_customer: Joi.string().default('0'),
            product_level: Joi.string().default('0')
          })
        },
        auth: false
      },
      handler: create
    });
  },
};

