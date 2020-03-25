'use-strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create, update } = require('../controllers/courseSlotController');
const { addressValidation } = require('./validations/utils');

exports.plugin = {
  name: 'routes-course-slots',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            address: Joi.alternatives().try(addressValidation, {}),
            courseId: Joi.objectId().required(),
          }),
        },
        auth: { scope: ['courses:edit'] },
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId() }),
          payload: Joi.object({
            startDate: Joi.date().required(),
            endDate: Joi.date().required(),
            address: Joi.alternatives().try(addressValidation, {}),
          }),
        },
        auth: { scope: ['courses:edit'] },
      },
      handler: update,
    });
  },
};
