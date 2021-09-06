'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list } = require('../controllers/eventHistoryController');
const { EVENTS_HISTORY_ACTIONS } = require('../models/EventHistory');
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
            auxiliaries: [Joi.array().items(Joi.objectId()), Joi.objectId()],
            sectors: [Joi.array().items(Joi.objectId()), Joi.objectId()],
            createdAt: Joi.date(),
            eventId: Joi.objectId(),
            action: Joi.array().items(Joi.string().valid(...EVENTS_HISTORY_ACTIONS)),
          }),
        },
        pre: [{ method: authorizeEventsHistoriesGet }],
      },
      handler: list,
    });
  },
};
