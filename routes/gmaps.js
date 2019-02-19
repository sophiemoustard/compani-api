'use strict';

const Joi = require('joi');
const Boom = require('boom');

const { getDirectionInfo } = require('../controllers/googleMapsController');

exports.plugin = {
  name: 'routes-gmap',
  register: async (server) => {
    // Get Google Map direction information
    server.route({
      method: 'GET',
      path: '/distancematrix',
      options: {
        validate: {
          query: Joi.object().keys({
            origins: Joi.string().required(),
            destinations: Joi.string().required()
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
        auth: {
          strategy: 'jwt',
        }
      },
      handler: getDirectionInfo
    });
  }
};
