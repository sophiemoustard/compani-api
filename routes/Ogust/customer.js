'use strict';

const Joi = require('joi');

const {
  getById,
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
  },
};

