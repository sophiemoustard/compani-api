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
} = require('../controllers/eventController');
const {
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION
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
            absence: Joi.string().when('type', { is: Joi.valid(ABSENCE), then: Joi.required() }),
            attachment: Joi.object().keys({
              driveId: Joi.string(),
              link: Joi.string(),
            }),
            repetition: Joi.object().keys({
              frequency: Joi.string().required(),
            }),
          })
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
            customer: Joi.array().items(Joi.string()),
            type: Joi.string(),
          },
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: list,
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
            absence: Joi.string(),
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
              condition: Joi.string().when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
              reason: Joi.string().when('isCancelled', { is: Joi.valid(true), then: Joi.required() }),
            }),
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
