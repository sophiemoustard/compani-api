'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { update } = require('../controllers/userCompaniesController');
const { authorizeUserCompanyEdit } = require('./preHandlers/userCompanies');

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
            endDate: Joi.date().required(),
          }),
        },
        pre: [{ method: authorizeUserCompanyEdit }],
      },
      handler: update,
    });
  },
};
