'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list } = require('../controllers/eventHistoryController');
const { authorizeEventsHistoriesGet } = require('./preHandlers/eventHistories');

exports.plugin = {
  name: 'routes-event-history',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          query: Joi.object({
            auxiliaries: [Joi.array().items(Joi.string()), Joi.string()],
            sectors: [Joi.array().items(Joi.string()), Joi.string()],
            createdAt: Joi.date(),
          }),
        },
        pre: [{ method: authorizeEventsHistoriesGet }],
      },
      handler: list,
    });
  },
};
