'use strict';

const Joi = require('joi');
const Boom = require('boom');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  storeUserModificationPlanning,
  updateModificationPlanningStatus,
  removeModificationPlanning
} = require('../controllers/planningUpdateController');

exports.plugin = {
  name: 'routes-planning-updates',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            userId: Joi.objectId(),
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: 'jwt'
      },
      handler: list
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            userId: Joi.objectId(),
            employee_id: Joi.string()
          }).or('userId', 'employee_id'),
          payload: Joi.object().keys({
            content: Joi.string(),
            involved: Joi.string(),
            type: Joi.string().required(),
            check: Joi.object().allow(null)
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: 'jwt'
      },
      handler: storeUserModificationPlanning
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/status',
      options: {
        validate: {
          params: Joi.object().keys({
            _id: Joi.objectId().required(),
          }),
          payload: Joi.object().keys({
            isChecked: Joi.boolean().default(false),
            checkBy: Joi.objectId().default(null),
            checkedAt: Joi.date().default(null),
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: 'jwt'
      },
      handler: updateModificationPlanningStatus
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() },
          query: { userId: Joi.objectId().required() },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: 'jwt'
      },
      handler: removeModificationPlanning
    });
  }
};
