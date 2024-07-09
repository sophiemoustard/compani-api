'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  list,
  remove,
  removeRepetition,
  listForCreditNotes,
  getWorkingStats,
  timeStampEvent,
} = require('../controllers/eventController');
const {
  MANUAL_TIME_STAMPING_REASONS,
  CUSTOMER,
  AUXILIARY,
  TIMESTAMPING_ACTION_TYPE_LIST,
  MANUAL_TIME_STAMPING,
} = require('../helpers/constants');
const {
  EVENT_TYPES,
} = require('../models/Event');
const {
  getEvent,
  authorizeEventDeletion,
  authorizeEventGet,
  authorizeEventForCreditNoteGet,
  authorizeTimeStamping,
} = require('./preHandlers/events');
const {
  objectIdOrArray,
} = require('./validations/utils');

exports.plugin = {
  name: 'routes-event',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['events:read', 'customer-{query.customer}'] },
        validate: {
          query: Joi.object({
            startDate: Joi.date(),
            endDate: Joi.date(),
            auxiliary: objectIdOrArray,
            sector: objectIdOrArray,
            customer: objectIdOrArray,
            type: Joi.string().valid(...EVENT_TYPES),
            groupBy: Joi.string().valid(CUSTOMER, AUXILIARY),
            isCancelled: Joi.boolean(),
          }),
        },
        pre: [{ method: authorizeEventGet }],
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/credit-notes',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            customer: Joi.objectId().required(),
            thirdPartyPayer: Joi.objectId(),
            creditNoteId: Joi.objectId(),
          }),
        },
        pre: [{ method: authorizeEventForCreditNoteGet, assign: 'creditNote' }],
      },
      handler: listForCreditNotes,
    });

    server.route({
      method: 'GET',
      path: '/working-stats',
      handler: getWorkingStats,
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            auxiliary: objectIdOrArray,
          }),
        },
        pre: [{ method: authorizeEventGet }],
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeEventDeletion }],
      },
      handler: remove,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/repetition',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeEventDeletion, assign: 'event' }],
      },
      handler: removeRepetition,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/timestamping',
      options: {
        auth: { scope: ['timestamp:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            action: Joi.string().required().valid(...Object.keys(TIMESTAMPING_ACTION_TYPE_LIST)),
            startDate: Joi.date(),
            endDate: Joi.date(),
            reason: Joi.string()
              .valid(...Object.keys(MANUAL_TIME_STAMPING_REASONS))
              .when('action', { is: MANUAL_TIME_STAMPING, then: Joi.required(), otherwise: Joi.forbidden() }),
          }).xor('startDate', 'endDate'),
        },
        pre: [{ method: getEvent, assign: 'event' }, { method: authorizeTimeStamping }],
      },
      handler: timeStampEvent,
    });
  },
};
