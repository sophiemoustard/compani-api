'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeRepetitionGet } = require('./preHandlers/repetitions');
const { list } = require('../controllers/repetitionController');

exports.plugin = {
  name: 'routes-repetition',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object({
            auxiliary: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeRepetitionGet }],
      },
      handler: list,
    });
  },
};
