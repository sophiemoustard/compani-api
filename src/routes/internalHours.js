'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeInternalHourUpdate, getInternalHour } = require('./preHandlers/internalHours');
const {
  create,
  update,
  list,
  remove,
} = require('../controllers/internalHourController');

exports.plugin = {
  name: 'routes-internal-hours',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            default: Joi.boolean(),
          }),
        },
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({ default: Joi.boolean() }),
        },
        pre: [
          { method: getInternalHour, assign: 'internalHour' },
          { method: authorizeInternalHourUpdate },
        ],
      },
      handler: update,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['config:read'] },
      },
      handler: list,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['config:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: getInternalHour, assign: 'internalHour' },
          { method: authorizeInternalHourUpdate },
        ],
      },
      handler: remove,
    });
  },
};
