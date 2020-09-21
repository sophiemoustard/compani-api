'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { authorizeStepDetachment, authorizeStepAdd, authorizeSubProgramUpdate } = require('./preHandlers/subPrograms');
const { update, addStep, detachStep } = require('../controllers/subProgramController');
const { STEP_TYPES } = require('../models/Step');
const { PUBLISHED } = require('../helpers/constants');

exports.plugin = {
  name: 'routes-sub-programs',
  register: async (server) => {
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.alternatives().try(
            Joi.object({ name: Joi.string(), steps: Joi.array().items(Joi.string()).min(1) }).min(1),
            Joi.object({ status: Joi.string().required().valid(PUBLISHED) })
          ),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeSubProgramUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/steps',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ name: Joi.string().required(), type: Joi.string().required().valid(...STEP_TYPES) }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeStepAdd }],
      },
      handler: addStep,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/steps/{stepId}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), stepId: Joi.objectId().required() }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: authorizeStepDetachment }],
      },
      handler: detachStep,
    });
  },
};
