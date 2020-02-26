
'use strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);

const { list } = require('../controllers/distanceMatrixController');


exports.plugin = {
  name: 'routes-distancematrix',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      handler: list,
    });
  }
};
