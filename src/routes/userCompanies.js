'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update } = require('../controllers/userCompanyController');
const { authorizeUserCompanyEdit } = require('./preHandlers/userCompanies');
const { requiredDateToISOString } = require('./validations/utils');

exports.plugin = {
  name: 'routes-usercompanies',
  register: async (server) => {
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
