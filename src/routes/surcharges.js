'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create, list, update, remove } = require('../controllers/surchargeController');
const { authorizeSurchargesUpdate } = require('./preHandlers/surcharges');

exports.plugin = {
  name: 'routes-surcharges',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            saturday: Joi.number().allow('', null),
            sunday: Joi.number().allow('', null),
            publicHoliday: Joi.number().allow('', null),
            twentyFifthOfDecember: Joi.number().allow('', null),
            firstOfMay: Joi.number().allow('', null),
            evening: Joi.number().allow('', null),
            eveningStartTime: Joi.string().allow('', null).when('evening', { is: Joi.number(), then: Joi.required() }),
            eveningEndTime: Joi.string().allow('', null).when('evening', { is: Joi.number(), then: Joi.required() }),
            custom: Joi.number().allow('', null),
            customStartTime: Joi.string().allow('', null).when('custom', { is: Joi.number(), then: Joi.required() }),
            customEndTime: Joi.string().allow('', null).when('custom', { is: Joi.number(), then: Joi.required() }),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { scope: ['config:read'] },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            name: Joi.string(),
            saturday: Joi.number().allow('', null).default(null),
            sunday: Joi.number().allow('', null).default(null),
            publicHoliday: Joi.number().allow('', null).default(null),
            twentyFifthOfDecember: Joi.number().allow('', null).default(null),
            firstOfMay: Joi.number().allow('', null).default(null),
            evening: Joi.number().allow('', null).default(null),
            eveningStartTime: Joi.string().allow('', null).default('')
              .when('evening', { is: Joi.number(), then: Joi.required() }),
            eveningEndTime: Joi.string().allow('', null).default('')
              .when('evening', { is: Joi.number(), then: Joi.required() }),
            custom: Joi.number().allow('', null).default(null),
            customStartTime: Joi.string().allow('', null).default('')
              .when('custom', { is: Joi.number(), then: Joi.required() }),
            customEndTime: Joi.string().allow('', null).default('')
              .when('custom', { is: Joi.number(), then: Joi.required() }),
          }),
        },
        pre: [{ method: authorizeSurchargesUpdate, assign: 'surcharge' }],
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeSurchargesUpdate, assign: 'surcharge' }],
      },
    });
  },
};
