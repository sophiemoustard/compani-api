'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  list,
  create,
  update,
  remove,
  removeRepetition,
  deleteList,
  listForCreditNotes,
  getWorkingStats,
  getPaidTransportStatsBySector,
  getUnassignedHoursBySector,
  timeStampEvent,
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
  MANUAL_TIME_STAMPING_REASONS,
  MANUAL_TIME_STAMPING,
} = require('../helpers/constants');
const {
  EVENT_TYPES,
  ABSENCE_NATURES,
  EVENT_CANCELLATION_CONDITIONS,
  EVENT_CANCELLATION_REASONS,
  ABSENCE_TYPES,
  REPETITION_FREQUENCIES,
} = require('../models/Event');
const {
  getEvent,
  authorizeEventCreation,
  authorizeEventUpdate,
  authorizeEventDeletion,
  authorizeEventDeletionList,
  authorizeEventGet,
  authorizeEventForCreditNoteGet,
  authorizeTimeStamping,
} = require('./preHandlers/events');
const { monthValidation, addressValidation, objectIdOrArray } = require('./validations/utils');

exports.plugin = {
  name: 'routes-event',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          payload: Joi.object().keys({
            type: Joi.string().required().valid(...EVENT_TYPES),
            startDate: Joi.date().required(),
            endDate: Joi.date().required().greater(Joi.ref('startDate')),
            auxiliary: Joi.objectId(),
            customer: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            address: addressValidation.when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            sector: Joi.objectId(),
            misc: Joi.string().allow(null, '').when('absence', { is: Joi.exist().valid(OTHER), then: Joi.required() }),
            subscription: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            internalHour: Joi.objectId().when('type', { is: Joi.valid(INTERNAL_HOUR), then: Joi.required() }),
            absence: Joi.string().valid(...ABSENCE_TYPES)
              .when('type', { is: Joi.valid(ABSENCE), then: Joi.required() })
              .when('absenceNature', { is: Joi.valid(HOURLY), then: Joi.valid(UNJUSTIFIED) }),
            absenceNature: Joi.string().valid(...ABSENCE_NATURES)
              .when('type', { is: Joi.valid(ABSENCE), then: Joi.required() }),
            extension: Joi.objectId(),
            attachment: Joi.object().keys({
              driveId: Joi.string(),
              link: Joi.string(),
            }).when('absence', { is: Joi.exist().valid(ILLNESS, WORK_ACCIDENT), then: Joi.required() }),
            repetition: Joi.object().keys({
              frequency: Joi.string().required().valid(...REPETITION_FREQUENCIES),
            }),
          }).xor('sector', 'auxiliary'),
        },
        pre: [{ method: authorizeEventCreation }],
      },
      handler: create,
    });

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
            type: Joi.string(),
            groupBy: Joi.string(),
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
      method: 'GET',
      path: '/paid-transport',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: objectIdOrArray.required(),
            month: monthValidation.required(),
          }),
        },
        pre: [{ method: authorizeEventGet }],
      },
      handler: getPaidTransportStatsBySector,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            startDate: Joi.date(),
            endDate: Joi.date().greater(Joi.ref('startDate')),
            auxiliary: Joi.objectId(),
            sector: Joi.string(),
            address: Joi.when(
              'type',
              {
                is: Joi.valid(INTERNAL_HOUR),
                then: Joi.alternatives().try(addressValidation, {}),
                otherwise: addressValidation,
              }
            ),
            subscription: Joi.objectId(),
            internalHour: Joi.objectId(),
            absence: Joi.string().valid(...ABSENCE_TYPES)
              .when('absenceNature', { is: Joi.valid(HOURLY), then: Joi.valid(UNJUSTIFIED) }),
            absenceNature: Joi.string().valid(...ABSENCE_NATURES),
            attachment: Joi.object().keys({
              driveId: Joi.string(),
              link: Joi.string(),
            }).when('absence', { is: Joi.exist().valid(ILLNESS, WORK_ACCIDENT), then: Joi.required() }),
            misc: Joi.string().allow(null, '').default('')
              .when('absence', { is: Joi.exist().valid(OTHER), then: Joi.required() })
              .when('isCancelled', { is: Joi.exist().valid(true), then: Joi.required() }),
            repetition: Joi.object().keys({
              frequency: Joi.string().valid(...REPETITION_FREQUENCIES),
              parentId: Joi.objectId(),
            }),
            isCancelled: Joi.boolean(),
            shouldUpdateRepetition: Joi.boolean(),
            cancel: Joi.object().keys({
              condition: Joi.string()
                .valid(...EVENT_CANCELLATION_CONDITIONS)
                .when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
              reason: Joi.string()
                .valid(...EVENT_CANCELLATION_REASONS)
                .when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
            }),
            isBilled: Joi.boolean(),
            bills: Joi.object(),
          })
            .and('startDate', 'endDate')
            .xor('auxiliary', 'sector'),
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
        auth: { scope: ['events:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: getEvent, assign: 'event' },
          { method: authorizeEventDeletion },
        ],
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
        pre: [
          { method: getEvent, assign: 'event' },
          { method: authorizeEventDeletion },
        ],
      },
      handler: removeRepetition,
    });

    server.route({
      method: 'DELETE',
      path: '/',
      options: {
        auth: { scope: ['events:edit'] },
        validate: {
          query: Joi.object().keys({
            customer: Joi.objectId().required(),
            startDate: Joi.date().required(),
            endDate: Joi.date(),
          }),
        },
        pre: [{ method: authorizeEventDeletionList }],
      },
      handler: deleteList,
    });

    server.route({
      method: 'GET',
      path: '/unassigned-hours',
      options: {
        auth: { scope: ['events:read'] },
        validate: {
          query: Joi.object().keys({
            sector: objectIdOrArray.required(),
            month: monthValidation.required(),
          }),
        },
        pre: [{ method: authorizeEventGet }],
      },
      handler: getUnassignedHoursBySector,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/timestamping',
      options: {
        auth: { scope: ['timestamp:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            action: Joi.string().required().valid(MANUAL_TIME_STAMPING),
            startDate: Joi.date().required(),
            reason: Joi.string().required().valid(...MANUAL_TIME_STAMPING_REASONS),
          }),
        },
        pre: [{ method: getEvent, assign: 'event' }, { method: authorizeTimeStamping }],
      },
      handler: timeStampEvent,
    });
  },
};
