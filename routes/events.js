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
  UNAVAILABILITY,
  INTERVENTION,
  DAILY,
  HOURLY,
  UNJUSTIFIED,
  ILLNESS,
  INVOICED_AND_NOT_PAYED,
  INVOICED_AND_PAYED,
  CUSTOMER_INITIATIVE,
  AUXILIARY_INITIATIVE,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
} = require('../helpers/constants');

exports.plugin = {
  name: 'routes-event',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            type: Joi.string().required().valid(INTERNAL_HOUR, INTERVENTION, ABSENCE, UNAVAILABILITY),
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            auxiliary: Joi.objectId().required(),
            customer: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            location: Joi.object().keys({
              street: Joi.string(),
              zipCode: Joi.string(),
              city: Joi.string(),
              fullAddress: Joi.string(),
            }),
            sector: Joi.objectId().required(),
            misc: Joi.string().allow(null, ''),
            subscription: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            internalHour: Joi.object().keys({
              name: Joi.string(),
              _id: Joi.objectId(),
              default: Joi.boolean(),
            }).when('type', { is: Joi.valid(INTERNAL_HOUR), then: Joi.required() }),
            absence: Joi.string()
              .when('type', { is: Joi.valid(ABSENCE), then: Joi.required() })
              .when('absenceNature', { is: Joi.valid(HOURLY), then: Joi.valid(UNJUSTIFIED) }),
            absenceNature: Joi.string().valid(DAILY, HOURLY).when('type', { is: Joi.valid(ABSENCE), then: Joi.required() }),
            attachment: Joi.object().keys({
              driveId: Joi.string(),
              link: Joi.string(),
            }),
            repetition: Joi.object().keys({
              frequency: Joi.string().required(),
            }),
            status: Joi.string().valid(CUSTOMER_CONTRACT, COMPANY_CONTRACT)
              .when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
          }).when(Joi.object({ type: Joi.valid(ABSENCE), absence: Joi.valid(ILLNESS) }).unknown(), { then: Joi.object({ attachment: Joi.required() }) }),
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: {
            startDate: Joi.string(),
            endDate: Joi.string(),
            auxiliary: [Joi.array().items(Joi.string()), Joi.string()],
            customer: [Joi.array().items(Joi.string()), Joi.string()],
            type: Joi.string(),
            isBilled: Joi.boolean(),
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/credit-notes',
      options: {
        validate: {
          query: {
            startDate: Joi.string(),
            endDate: Joi.string(),
            customer: Joi.objectId(),
            thirdPartyPayer: Joi.objectId(),
            isBilled: Joi.boolean()
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: listForCreditNotes,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId() },
          payload: Joi.object().keys({
            startDate: Joi.date(),
            endDate: Joi.date(),
            auxiliary: Joi.objectId(),
            sector: Joi.string(),
            location: Joi.object().keys({
              street: Joi.string(),
              zipCode: Joi.string(),
              city: Joi.string(),
              fullAddress: Joi.string(),
            }),
            subscription: Joi.objectId(),
            internalHour: Joi.object(),
            absence: Joi.string().when('absenceNature', { is: Joi.valid(HOURLY), then: Joi.valid(UNJUSTIFIED) }),
            absenceNature: Joi.string().valid(DAILY, HOURLY),
            attachment: Joi.object().keys({
              driveId: Joi.string(),
              link: Joi.string(),
            }),
            misc: Joi.string().allow(null, '').default(''),
            repetition: Joi.object().keys({
              frequency: Joi.string(),
              parentId: Joi.objectId(),
            }),
            isCancelled: Joi.boolean(),
            shouldUpdateRepetition: Joi.boolean(),
            cancel: Joi.object().keys({
              condition: Joi.string()
                .valid(INVOICED_AND_NOT_PAYED, INVOICED_AND_PAYED)
                .when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
              reason: Joi.string()
                .valid(CUSTOMER_INITIATIVE, AUXILIARY_INITIATIVE)
                .when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
            }),
            isBilled: Joi.boolean(),
            status: Joi.string().valid(CUSTOMER_CONTRACT, COMPANY_CONTRACT),
            bills: Joi.object(),
          })
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: update,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId() }
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: remove,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/repetition',
      options: {
        validate: {
          params: { _id: Joi.objectId() }
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: removeRepetition,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        auth: { strategy: 'jwt' },
      }
    });
  },
};
