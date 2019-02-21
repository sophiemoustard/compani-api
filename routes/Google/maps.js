'use strict';

const Joi = require('joi');
const moment = require('moment');

const { getDistanceMatrix } = require('../../controllers/Google/mapsController');

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
            destinations: Joi.string().required(),
            mode: Joi.string().default('transit'),
            language: Joi.string().default('fr-FR'),
            departure_time: Joi.number().default(moment().hours(12).add(7, 'd').startOf('w')
              .unix()), // UTC timestamp
            arrival_time: Joi.number() // UTC timestamp
          }).required()
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: getDistanceMatrix
    });
  }
};
