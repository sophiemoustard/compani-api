'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { create, update } = require('../controllers/userCompanyController');
const { authorizeUserCompanyCreation, authorizeUserCompanyEdit } = require('./preHandlers/userCompanies');
const { dateToISOString, requiredDateToISOString } = require('./validations/utils');

exports.plugin = {
  name: 'routes-usercompanies',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['users:edit'] },
        validate: {
          payload: Joi.object().keys({
            startDate: dateToISOString,
            user: Joi.objectId().required(),
            company: Joi.objectId().required(),
          }),
        },
        pre: [{ method: authorizeUserCompanyCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['users:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            endDate: requiredDateToISOString,
          }),
        },
        pre: [{ method: authorizeUserCompanyEdit }],
      },
      handler: update,
    });
  },
};
