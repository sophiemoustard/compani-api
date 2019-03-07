'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  update,
  remove
} = require('../controllers/surchargeController');

exports.plugin = {
  name: 'routes-surcharges',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            saturdays: Joi.number().allow('', null),
            sundays: Joi.number().allow('', null),
            publicHolidays: Joi.number().allow('', null),
            christmas: Joi.number().allow('', null),
            laborDay: Joi.number().allow('', null),
            evenings: Joi.number().allow('', null),
            eveningsStartTime: Joi.date().allow('', null),
            eveningsEndTime: Joi.date().allow('', null),
            customs: Joi.number().allow('', null),
            customsStartTime: Joi.date().allow('', null),
            customsEndTime: Joi.date().allow('', null),
            service: Joi.objectId().required(),
            company: Joi.objectId().required(),
          })
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/',
      handler: list,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          query: {
            company: Joi.objectId(),
            service: Joi.objectId()
          }
        }
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      handler: remove,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          }
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      handler: update,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string(),
            saturdays: Joi.number().allow('', null),
            sundays: Joi.number().allow('', null),
            publicHolidays: Joi.number().allow('', null),
            christmas: Joi.number().allow('', null),
            laborDay: Joi.number().allow('', null),
            evenings: Joi.number().allow('', null),
            eveningsStartTime: Joi.date().allow('', null),
            eveningsEndTime: Joi.date().allow('', null),
            customs: Joi.number().allow('', null),
            customsStartTime: Joi.date().allow('', null),
            customsEndTime: Joi.date().allow('', null),
            service: Joi.objectId(),
          })
        },
      },
    });
  }
};
