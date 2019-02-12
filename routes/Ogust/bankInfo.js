'use strict';

const Joi = require('joi');
const Boom = require('boom');

const {
  getById,
  updateById
} = require('../../controllers/Ogust/bankInfoController');

exports.plugin = {
  name: 'routes-ogust-bankinfo',
  register: async (server) => {
    // Get all customers
    server.route({
      method: 'GET',
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
      handler: getById
    });
    // Update bankInfo by id
    server.route({
      method: 'PUT',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            id_tiers: [Joi.string(), Joi.number()],
            iban_number: Joi.string(),
            bic_number: Joi.string(),
            holder: Joi.string()
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
  },
};

