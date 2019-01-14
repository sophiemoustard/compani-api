'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  list,
  create,
  update,
  remove,
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
            subType: Joi.string().required(),
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            auxiliary: Joi.objectId().required(),
            customer: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
            location: Joi.object().keys({
              street: Joi.string(),
              zipCode: Joi.string(),
              city: Joi.string(),
              fullAddress: Joi.string(),
              location: {
                type: Joi.string(),
                coordinates: Joi.array()
              },
            }),
            misc: Joi.string().allow(null, ''),
            subscription: Joi.objectId().when('type', { is: Joi.valid(INTERVENTION), then: Joi.required() }),
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
            subType: Joi.string(),
            startDate: Joi.date(),
            endDate: Joi.date(),
            auxiliary: Joi.objectId(),
            customer: Joi.objectId(),
            location: Joi.object().keys({
              street: Joi.string(),
              zipCode: Joi.string(),
              city: Joi.string(),
              fullAddress: Joi.string(),
              location: {
                type: Joi.string(),
                coordinates: Joi.array()
              },
            }),
            misc: Joi.string().allow(null, ''),
            subscription: Joi.objectId(),
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
          params: { _id: Joi.objectId() },
        },
        auth: {
          strategy: 'jwt',
        }
      },
      handler: remove,
    });
  },
};
