'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  list,
  create,
  update,
  remove,
  uploadFile,
  removeRepetition,
  listForCreditNotes,
} = require('../controllers/eventController');
const {
  INTERNAL_HOUR,
  ABSENCE,
  INTERVENTION,
  HOURLY,
  UNJUSTIFIED,
  ILLNESS,
  OTHER,
  WORK_ACCIDENT,
} = require('../helpers/constants');
const { CONTRACT_STATUS } = require('../models/Contract');
const {
  EVENT_TYPES,
  ABSENCE_NATURES,
  EVENT_CANCELLATION_CONDITIONS,
  EVENT_CANCELLATION_REASONS,
  ABSENCE_TYPES,
  REPETITION_FREQUENCIES,
} = require('../models/Event');
const { getEvent, authorizeEventUpdate } = require('./preHandlers/events');

exports.plugin = {
  name: 'routes-event',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['events:edit', 'events:sector:edit', 'events:own:edit'] },
        validate: {
          payload: Joi.object().keys({
            type: Joi.string().required().valid(EVENT_TYPES),
            startDate: Joi.date().required(),
            endDate: Joi.date().required().greater(Joi.ref('startDate')),
            auxiliary: Joi.objectId(), // Unassigned event
            customer: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            address: Joi.object().keys({
              street: Joi.string(),
              zipCode: Joi.string(),
              city: Joi.string(),
              fullAddress: Joi.string(),
            }),
            sector: Joi.objectId().required(),
            misc: Joi.string().allow(null, '').when('absence', { is: Joi.exist().valid(OTHER), then: Joi.required() }),
            subscription: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            internalHour: Joi.object().keys({
              name: Joi.string(),
              _id: Joi.objectId(),
              default: Joi.boolean(),
            }).when('type', { is: Joi.valid(INTERNAL_HOUR), then: Joi.required() }),
            absence: Joi.string().valid(ABSENCE_TYPES)
              .when('type', { is: Joi.valid(ABSENCE), then: Joi.required() })
              .when('absenceNature', { is: Joi.valid(HOURLY), then: Joi.valid(UNJUSTIFIED) }),
            absenceNature: Joi.string().valid(ABSENCE_NATURES).when('type', { is: Joi.valid(ABSENCE), then: Joi.required() }),
            attachment: Joi.object().keys({
              driveId: Joi.string(),
              link: Joi.string(),
            }).when('absence', { is: Joi.exist().valid([ILLNESS, WORK_ACCIDENT]), then: Joi.required() }),
            repetition: Joi.object().keys({
              frequency: Joi.string().required().valid(REPETITION_FREQUENCIES),
            }),
            status: Joi.string().valid(CONTRACT_STATUS)
              .when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
          }).when(Joi.object({ type: Joi.valid(ABSENCE), absence: Joi.valid(ILLNESS) }).unknown(), { then: Joi.object({ attachment: Joi.required() }) }),
        },
        pre: [
          { method: authorizeEventUpdate },
        ],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['events:read', 'customer-{query.customer}'] },
        validate: {
          query: {
            startDate: Joi.date(),
            endDate: Joi.date(),
            auxiliary: [Joi.array().items(Joi.string()), Joi.string()],
            sector: [Joi.array().items(Joi.string()), Joi.string()],
            customer: [Joi.array().items(Joi.string()), Joi.string()],
            type: Joi.string(),
            groupBy: Joi.string(),
          },
        },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/credit-notes',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: {
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            customer: Joi.objectId().required(),
            thirdPartyPayer: Joi.objectId(),
            isBilled: Joi.boolean().required(),
          },
        },
      },
      handler: listForCreditNotes,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit', 'events:sector:edit', 'events:own:edit'] },
        validate: {
          params: { _id: Joi.objectId() },
          payload: Joi.object().keys({
            startDate: Joi.date(),
            endDate: Joi.date().greater(Joi.ref('startDate')),
            auxiliary: Joi.objectId(),
            sector: Joi.string().required(),
            address: Joi.object().keys({
              street: Joi.string().allow(null, '').default(''),
              zipCode: Joi.string().allow(null, '').default(''),
              city: Joi.string().allow(null, '').default(''),
              fullAddress: Joi.string().allow(null, '').default(''),
            }),
            subscription: Joi.objectId(),
            internalHour: Joi.object(),
            absence: Joi.string().valid(ABSENCE_TYPES).when('absenceNature', { is: Joi.valid(HOURLY), then: Joi.valid(UNJUSTIFIED) }),
            absenceNature: Joi.string().valid(ABSENCE_NATURES),
            attachment: Joi.object().keys({
              driveId: Joi.string(),
              link: Joi.string(),
            }).when('absence', { is: Joi.exist().valid([ILLNESS, WORK_ACCIDENT]), then: Joi.required() }),
            misc: Joi.string().allow(null, '').default('').when('absence', { is: Joi.exist().valid(OTHER), then: Joi.required() }),
            repetition: Joi.object().keys({
              frequency: Joi.string().valid(REPETITION_FREQUENCIES),
              parentId: Joi.objectId(),
            }),
            isCancelled: Joi.boolean(),
            shouldUpdateRepetition: Joi.boolean(),
            cancel: Joi.object().keys({
              condition: Joi.string()
                .valid(EVENT_CANCELLATION_CONDITIONS)
                .when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
              reason: Joi.string()
                .valid(EVENT_CANCELLATION_REASONS)
                .when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
            }),
            isBilled: Joi.boolean(),
            status: Joi.string().valid(CONTRACT_STATUS),
            bills: Joi.object(),
          }).and('startDate', 'endDate'),
        },
        pre: [
          { method: getEvent, assign: 'event' },
          { method: authorizeEventUpdate },
        ],
      },

      handler: update,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit', 'events:sector:edit', 'events:own:edit'] },
        validate: {
          params: { _id: Joi.objectId() },
        },
        pre: [
          { method: getEvent, assign: 'event' },
          { method: authorizeEventUpdate },
        ],
      },
      handler: remove,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/repetition',
      options: {
        auth: { scope: ['events:edit', 'events:sector:edit', 'events:own:edit'] },
        validate: {
          params: { _id: Joi.objectId() },
        },
        pre: [
          { method: getEvent, assign: 'event' },
          { method: authorizeEventUpdate },
        ],
      },
      handler: removeRepetition,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        auth: { scope: ['events:edit', 'events:sector:edit', 'events:own:edit'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        pre: [
          { method: getEvent, assign: 'event' },
          { method: authorizeEventUpdate },
        ],
      },
    });
  },
};
