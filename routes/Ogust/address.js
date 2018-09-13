'use strict';

const Joi = require('joi');

const {
  update,
} = require('../../controllers/Ogust/addressController');

exports.plugin = {
  name: 'routes-ogust-address',
  register: async (server) => {
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
            id_address: Joi.string().required(),
            line: Joi.string().allow('', null),
            supplement: Joi.string().allow('', null),
            zip: Joi.string().allow('', null),
            city: Joi.string().allow('', null),
          }).required()
        },
        auth: false
      },
      handler: update
    });
  },
};

