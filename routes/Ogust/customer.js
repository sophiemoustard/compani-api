'use strict';

const Joi = require('joi');

const {
  getById,
  create,
} = require('../../controllers/Ogust/customerController');

exports.plugin = {
  name: 'routes-ogust-customers',
  register: async (server) => {
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

