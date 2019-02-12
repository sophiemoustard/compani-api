'use strict';

const Joi = require('joi');
const Boom = require('boom');

const { show } = require('../controllers/esignController');

exports.plugin = {
  name: 'routes-esign',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        validate: {
          params: {
            id: Joi.string().required()
          },
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
        auth: 'jwt'
      },
      handler: show
    });
  }
};
