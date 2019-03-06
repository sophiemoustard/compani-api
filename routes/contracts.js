'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  get,
  create,
  update,
  remove,
  createContractVersion,
  updateContractVersion,
  removeContractVersion,
  uploadFile,
} = require('../controllers/contractController');

exports.plugin = {
  name: 'contract-routes',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            user: Joi.objectId(),
            customer: Joi.objectId(),
          })
        },
        auth: { strategy: 'jwt' },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object().keys({
            _id: Joi.objectId(),
          })
        },
        auth: { strategy: 'jwt' },
      },
      handler: get,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            startDate: Joi.date().required(),
            status: Joi.string().required(),
            versions: Joi.array().items({
              grossHourlyRate: Joi.number().required(),
              weeklyHours: Joi.number().required(),
              startDate: Joi.date().required(),
            }),
            user: Joi.objectId().required(),
          })
        },
        auth: { strategy: 'jwt' },
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() },
          payload: {
            startDate: Joi.date(),
            endDate: Joi.date(),
            endReason: Joi.string(),
            otherMisc: Joi.string(),
            endNotificationDate: Joi.date(),
          },
        },
        auth: { strategy: 'jwt' },
      },
      handler: update,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() },
        },
        auth: { strategy: 'jwt' },
      },
      handler: remove,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/versions',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: {
            startDate: Joi.date().required(),
            endDate: Joi.date(),
            weeklyHours: Joi.number().required(),
            grossHourlyRate: Joi.number(),
            ogustContractId: Joi.string(),
          },
        },
        auth: { strategy: 'jwt' },
      },
      handler: createContractVersion,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/versions/{versionId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            versionId: Joi.objectId().required()
          },
          payload: {
            isActive: Joi.boolean(),
            endDate: Joi.date(),
          },
        },
        auth: { strategy: 'jwt' },
      },
      handler: updateContractVersion,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/versions/{versionId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            versionId: Joi.objectId().required(),
          },
        },
        auth: { strategy: 'jwt' },
      },
      handler: removeContractVersion,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880
        },
        auth: {
          strategy: 'jwt',
        }
      }
    });
  }
};
