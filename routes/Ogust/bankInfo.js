'use strict';

const Joi = require('joi');

const {
  getById,
  updateByEmployeeId
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
          params: { id: Joi.string() }
        },
        auth: false
      },
      handler: getById
    });
    // Update customer by id
    server.route({
      method: 'PUT',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            id_tiers: Joi.string(),
            iban_number: Joi.string(),
            bic_number: Joi.string()
          })
        },
        auth: false
      },
      handler: updateByEmployeeId
    });
  },
};

