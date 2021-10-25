'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, update } = require('../controllers/eventHistoryController');
const { EVENTS_HISTORY_ACTIONS } = require('../models/EventHistory');
const { authorizeEventsHistoriesGet, authorizeEventHistoryCancellation } = require('./preHandlers/eventHistories');
const { objectIdOrArray } = require('./validations/utils');

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
            auxiliaries: objectIdOrArray,
            sectors: objectIdOrArray,
            createdAt: Joi.date(),
            eventId: Joi.objectId(),
            action: Joi.array().items(Joi.string().valid(...EVENTS_HISTORY_ACTIONS)),
          }),
        },
        pre: [{ method: authorizeEventsHistoriesGet }],
      },
      handler: list,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ isCancelled: Joi.boolean().required().valid(true) }),
        },
        pre: [{ method: authorizeEventHistoryCancellation }],
      },
      handler: update,
    });
  },
};
