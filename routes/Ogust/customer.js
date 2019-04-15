'use strict';

const Joi = require('joi');

const {
  list,
  getById,
  updateById,
  create,
} = require('../../controllers/Ogust/customerController');

exports.plugin = {
  name: 'routes-ogust-customers',
  register: async (server) => {
    // Get all customers
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: {
            email: Joi.string().email(),
            status: Joi.string().default('A'),
            last_name: Joi.string(),
            sector: Joi.string(),
            nbperpage: Joi.number().default(100),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: list
    });
    // Get customer by id
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
    // Update customer by id
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
            last_name: Joi.string(),
            first_name: Joi.string().allow('', null),
            email: Joi.string().email(),
            mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/).allow('', null),
            door_code: Joi.string().allow(null, ''),
            intercom_code: Joi.string().allow(null, ''),
            landline: Joi.string(),
            date_of_birth: Joi.string()
          }).required()
        },
        auth: false
      },
      handler: updateById
    });

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
            origin: Joi.string().default('253195735'),
            method_of_payment: Joi.string().default('112539'),
            manager: Joi.string().default('302007671'),
            type: Joi.string().default('C'),
            exoneration: Joi.string().default('D'),
            main_address: Joi.object().keys({
              line: Joi.string(),
              supplement: Joi.string(),
              zip: Joi.string(),
              city: Joi.string(),
              type: Joi.string().default('Adrpri'),
              country: Joi.string().default('FR')
            }).required()
          }).required()
        },
        auth: false
      },
      handler: create
    });
  },
};

