'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create, update, remove } = require('../controllers/courseSlotController');
const { addressValidation } = require('./validations/utils');
const { getCourseSlot, authorizeCreate, authorizeUpdate, authorizeDeletion } = require('./preHandlers/courseSlot');

exports.plugin = {
  name: 'routes-course-slots',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            startDate: Joi.date(),
            endDate: Joi.date().when('startDate', { is: Joi.exist(), then: Joi.required() }),
            address: Joi.alternatives().try(addressValidation, {}),
            course: Joi.objectId().required(),
            step: Joi.objectId().when('startDate', { is: Joi.exist(), then: Joi.required() }),
          }),
        },
        pre: [{ method: authorizeCreate }],
        auth: { scope: ['courses:edit'] },
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            address: Joi.alternatives().try(addressValidation, {}),
            step: Joi.objectId().when('startDate', { is: Joi.exist(), then: Joi.required() }),
          }),
        },
        pre: [{ method: getCourseSlot, assign: 'courseSlot' }, { method: authorizeUpdate }],
        auth: { scope: ['courses:edit'] },
      },
      handler: update,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: getCourseSlot, assign: 'courseSlot' }, { method: authorizeDeletion }],
        auth: { scope: ['courses:edit'] },
      },
      handler: remove,
    });
  },
};
