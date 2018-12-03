'use strict';

const Joi = require('joi');

const {
  updateById,
  list,
  create,
  deleteById
} = require('../../controllers/Ogust/contactController');

exports.plugin = {
  name: 'routes-ogust-contacts',
  register: async (server) => {
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
            id_interloc: Joi.string(),
            id_customer: Joi.string().allow('', null),
            last_name: Joi.string().allow('', null),
            first_name: Joi.string().allow('', null),
            email: Joi.string().email(),
            mobile: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/).allow('', null),
            landline: Joi.string().allow('', null)
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
            id_customer: Joi.string().required(),
            last_name: Joi.string().required(),
            first_name: Joi.string(),
            email: Joi.string().email()
          }).required()
        },
        auth: false
      },
      handler: create
    });

    server.route({
      method: 'DELETE',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string().required() }
        },
        auth: false
      },
      handler: deleteById
    });
  },
};

