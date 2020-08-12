'use strict';

const Joi = require('joi');

const { show } = require('../controllers/esignController');

exports.plugin = {
  name: 'routes-esign',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        validate: {
          params: Joi.object({ id: Joi.string().required() }),
        },
      },
      handler: show,
    });
  },
};
