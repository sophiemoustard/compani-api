'use strict';

const Joi = require('joi');
const Boom = require('boom');

const {
  create,
  list,
  updateById,
  removeById
} = require('../../controllers/Ogust/contractController');

exports.plugin = {
  name: 'routes-ogust-contracts',
  register: async (server) => {
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
            type: Joi.string().default('CDI'),
            collective_convention: Joi.string().default('0005'),
            nature: Joi.string().default('00201'),
            nature_2: Joi.string().default(':1:0:0:0'),
            specificity: Joi.string().default('0'),
            regime: Joi.string().default('50'),
            social_category: Joi.string().default('015'),
            description: Joi.string().default("Auxiliaire d'envie"),
            contractual_salary: Joi.string().required(),
            contract_hours: Joi.string().required(),
            status: Joi.string().default('B'),
            annual_modulation: Joi.string().default('1'),
            type_employer: Joi.string(),
            motive_entry: Joi.string().default('001'),
            source_contract: Joi.string()
          }).required(),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: false
      },
      handler: create
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: Joi.object().keys({
            id_employee: Joi.string(),
            nbperpage: Joi.number().default(200),
          }).required(),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
            end_date: Joi.string(),
            contractual_salary: Joi.string(),
            contract_hours: Joi.string(),
            status: Joi.string(),
            type_renumeration: Joi.string(),
            due: Joi.string().when('status', { is: Joi.string().valid('V'), then: Joi.string().default('1') })
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
          params: { id: Joi.string() },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: false
      },
      handler: removeById
    });
  },
};

