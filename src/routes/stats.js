'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { getPaidInterventionStats } = require('../controllers/statController');
const { monthValidation, objectIdOrArray } = require('./validations/utils');
const { authorizeGetStats } = require('./preHandlers/stats');

exports.plugin = {
  name: 'routes-stats',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/paid-intervention-stats',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: objectIdOrArray,
            auxiliary: Joi.objectId(),
            month: monthValidation.required(),
          }).xor('sector', 'auxiliary'),
        },
        pre: [{ method: authorizeGetStats }],
      },
      handler: getPaidInterventionStats,
    });
  },
};
