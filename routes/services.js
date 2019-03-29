'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { CUSTOMER_CONTRACT, COMPANY_CONTRACT, HOURLY, FIXED } = require('../helpers/constants');


const {
  list,
  create,
  update,
  remove
} = require('../controllers/serviceController');

exports.plugin = {
  name: 'routes-services',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          payload: Joi.object().keys({
            type: Joi.string().required().valid(CUSTOMER_CONTRACT, COMPANY_CONTRACT),
            company: Joi.objectId().required(),
            versions: Joi.array().items({
              defaultUnitAmount: Joi.number().required(),
              name: Joi.string().required(),
              vat: Joi.number(),
              surcharge: Joi.objectId(),
            }),
            nature: Joi.string().required().valid(HOURLY, FIXED),
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
          query: { company: Joi.objectId() }
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
            startDate: Joi.date().required(),
            defaultUnitAmount: Joi.number(),
            name: Joi.string(),
            vat: Joi.number(),
            surcharge: Joi.objectId()
          })
        },
      },
    });
  }
};
