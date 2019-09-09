'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { CUSTOMER_CONTRACT, COMPANY_CONTRACT } = require('../helpers/constants');
const { CONTRACT_STATUS, END_CONTRACT_REASONS } = require('../models/Contract');

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
  receiveSignatureEvents,
} = require('../controllers/contractController');

exports.plugin = {
  name: 'contract-routes',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['contracts:read:user', 'user-{query.user}'] },
        validate: {
          query: Joi.object().keys({
            status: Joi.string(),
            user: Joi.objectId(),
            customer: Joi.objectId(),
          }),
        },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        auth: { scope: ['contracts:read:user', 'contracts:read'] },
        validate: {
          params: Joi.object().keys({
            _id: Joi.objectId(),
          }),
        },
      },
      handler: get,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['contracts:edit:user'] },
        validate: {
          payload: Joi.object().keys({
            startDate: Joi.date().required(),
            status: Joi.string().required().valid(CONTRACT_STATUS),
            versions: Joi.array().items(Joi.object({
              grossHourlyRate: Joi.number().required(),
              weeklyHours: Joi.number(),
              startDate: Joi.date().required(),
            }).required()
              .when('status', { is: COMPANY_CONTRACT, then: Joi.object({ weeklyHours: Joi.required() }) })
              .when('status', { is: CUSTOMER_CONTRACT, then: Joi.object({ weeklyHours: Joi.forbidden() }) })),
            user: Joi.objectId().required(),
            customer: Joi.objectId()
              .when('status', { is: CUSTOMER_CONTRACT, then: Joi.required() })
              .when('status', { is: COMPANY_CONTRACT, then: Joi.forbidden() }),
            signature: Joi.object().keys({
              templateId: Joi.string().required(),
              fields: Joi.object(),
              title: Joi.string().required(),
              signers: Joi.array().items(Joi.object().keys({
                id: Joi.string(),
                name: Joi.string(),
                email: Joi.string(),
              })).required(),
              meta: Joi.object(),
              redirect: Joi.string().uri(),
              redirectDecline: Joi.string().uri(),
            }),
          }),
        },
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['contracts:edit:user'] },
        validate: {
          params: { _id: Joi.objectId().required() },
          payload: {
            startDate: Joi.date(),
            endDate: Joi.date(),
            endReason: Joi.string().valid(END_CONTRACT_REASONS),
            otherMisc: Joi.string(),
            endNotificationDate: Joi.date(),
          },
        },
      },
      handler: update,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['contracts:edit:user'] },
        validate: {
          params: { _id: Joi.objectId().required() },
        },
      },
      handler: remove,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/versions',
      options: {
        auth: { scope: ['contracts:edit:user'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: {
            startDate: Joi.date().required(),
            endDate: Joi.date(),
            weeklyHours: Joi.number(),
            grossHourlyRate: Joi.number(),
            signature: Joi.object().keys({
              templateId: Joi.string().required(),
              fields: Joi.object(),
              title: Joi.string().required(),
              signers: Joi.array().items(Joi.object().keys({
                id: Joi.string(),
                name: Joi.string(),
                email: Joi.string(),
              })).required(),
              meta: Joi.object(),
              redirect: Joi.string().uri(),
              redirectDecline: Joi.string().uri(),
            }),
          },
        },
      },
      handler: createContractVersion,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/versions/{versionId}',
      options: {
        auth: { scope: ['contracts:edit:user'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            versionId: Joi.objectId().required(),
          },
          payload: {
            endDate: Joi.date(),
          },
        },
      },
      handler: updateContractVersion,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/versions/{versionId}',
      options: {
        auth: { scope: ['contracts:edit:user'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            versionId: Joi.objectId().required(),
          },
        },
      },
      handler: removeContractVersion,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        auth: { scope: ['contracts:edit:user'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
      },
    });

    server.route({
      method: 'POST',
      path: '/esign-webhook-receiver',
      handler: receiveSignatureEvents,
      options: { auth: false },
    });
  },
};
