'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeRepetitionGet, authorizeRepetitionDeletion } = require('./preHandlers/repetitions');
const { list, deleteRepetition } = require('../controllers/repetitionController');
const { requiredDateToISOString } = require('./validations/utils');

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
            auxiliary: Joi.objectId(),
            customer: Joi.objectId(),
          }).xor('auxiliary', 'customer'),
        },
        pre: [{ method: authorizeRepetitionGet }],
      },
      handler: list,
    });
    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          query: Joi.object({ startDate: requiredDateToISOString }),
        },
        pre: [{ method: authorizeRepetitionDeletion }],
      },
      handler: deleteRepetition,
    });
  },
};
