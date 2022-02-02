'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create, remove } = require('../controllers/courseFundingOrganisationController');
const {
  authorizeCourseFundingOrganisationCreate,
  authorizeCourseFundingOrganisationDelete,
} = require('./preHandlers/courseFundingOrganisation');
const { addressValidation } = require('./validations/utils');

exports.plugin = {
  name: 'routes-course-funding-organisations',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: { auth: { scope: ['config:vendor'] } },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
            address: addressValidation.required(),
          }),
        },
        auth: { scope: ['config:vendor'] },
        pre: [{ method: authorizeCourseFundingOrganisationCreate }],
      },
      handler: create,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['config:vendor'] },
        pre: [{ method: authorizeCourseFundingOrganisationDelete }],
      },
      handler: remove,
    });
  },
};
