'use strict';

const Joi = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);
const { END_CONTRACT_REASONS } = require('../models/Contract');
const {
  list,
  create,
  update,
  createContractVersion,
  updateContractVersion,
  removeContractVersion,
  uploadFile,
  receiveSignatureEvents,
  getStaffRegister,
} = require('../controllers/contractController');
const {
  getContract,
  authorizeContractUpdate,
  authorizeContractCreation,
  authorizeGetContract,
  authorizeUpload,
} = require('./preHandlers/contracts');

exports.plugin = {
  name: 'contract-routes',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['contracts:edit', 'user:read-{query.user}', 'customer-{query.customer}'] },
        validate: {
          query: Joi.object().keys({
            user: Joi.objectId(),
            startDate: Joi.date(),
            endDate: Joi.date(),
          }),
        },
        pre: [{ method: authorizeGetContract }],
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['contracts:edit'] },
        validate: {
          payload: Joi.object().keys({
            startDate: Joi.date().required(),
            user: Joi.objectId().required(),
            versions: Joi.array().items(Joi.object({
              grossHourlyRate: Joi.number().required(),
              weeklyHours: Joi.number().required(),
              startDate: Joi.date().required(),
              signature: Joi.object().keys({
                templateId: Joi.string().required(),
                fields: Joi.object(),
                title: Joi.string().required(),
                signers: Joi.array().items(Joi.object().keys({
                  id: Joi.string(),
                  name: Joi.string(),
                  email: Joi.string(),
                })).required(),
                meta: Joi.object({
                  auxiliaryDriveId: Joi.string().required(),
                }),
                redirect: Joi.string().uri(),
                redirectDecline: Joi.string().uri(),
              }),
            }).required()),
          }),
        },
        pre: [{ method: authorizeContractCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['contracts:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            endDate: Joi.date(),
            endReason: Joi.string().valid(...END_CONTRACT_REASONS),
            otherMisc: Joi.string(),
            endNotificationDate: Joi.date(),
          }),
        },
        pre: [
          { method: getContract, assign: 'contract' },
          { method: authorizeContractUpdate },
        ],
      },
      handler: update,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/versions',
      options: {
        auth: { scope: ['contracts:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            startDate: Joi.date().required(),
            weeklyHours: Joi.number().required(),
            grossHourlyRate: Joi.number().required(),
            signature: Joi.object().keys({
              templateId: Joi.string().required(),
              fields: Joi.object(),
              title: Joi.string().required(),
              signers: Joi.array().items(Joi.object().keys({
                id: Joi.string(),
                name: Joi.string(),
                email: Joi.string(),
              })).required(),
              meta: Joi.object({
                auxiliaryDriveId: Joi.string().required(),
              }),
              redirect: Joi.string().uri(),
              redirectDecline: Joi.string().uri(),
            }),
          }),
        },
        pre: [{ method: getContract, assign: 'contract' }, { method: authorizeContractUpdate }],
      },
      handler: createContractVersion,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/versions/{versionId}',
      options: {
        auth: { scope: ['contracts:edit'] },
        validate: {
          params: Joi.object({
            _id: Joi.objectId().required(),
            versionId: Joi.objectId().required(),
          }),
          payload: Joi.object({
            startDate: Joi.date(),
            endDate: Joi.date(),
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
              meta: Joi.object({
                auxiliaryDriveId: Joi.string().required(),
              }),
              redirect: Joi.string().uri(),
              redirectDecline: Joi.string().uri(),
            }),
          }),
        },
        pre: [{ method: getContract, assign: 'contract' }, { method: authorizeContractUpdate }],
      },
      handler: updateContractVersion,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/versions/{versionId}',
      options: {
        auth: { scope: ['contracts:edit'] },
        validate: {
          params: Joi.object({
            _id: Joi.objectId().required(),
            versionId: Joi.objectId().required(),
          }),
        },
        pre: [
          { method: getContract, assign: 'contract' },
          { method: authorizeContractUpdate },
        ],
      },
      handler: removeContractVersion,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        auth: { scope: ['contracts:edit'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        validate: {
          params: Joi.object({
            _id: Joi.objectId().required(),
            driveId: Joi.string().required(),
          }),
          payload: Joi.object({
            fileName: Joi.string().required(),
            contractId: Joi.objectId().required(),
            versionId: Joi.objectId().required(),
            file: Joi.any().required(),
            type: Joi.string().required().valid('signedContract'),
          }),
        },
        pre: [
          { method: getContract, assign: 'contract' },
          { method: authorizeUpload },
          { method: authorizeContractUpdate },
        ],
      },
    });

    server.route({
      method: 'POST',
      path: '/esign-webhook-receiver',
      handler: receiveSignatureEvents,
      options: { auth: false },
    });

    server.route({
      method: 'GET',
      path: '/staff-register',
      handler: getStaffRegister,
      options: {
        auth: { scope: ['contracts:edit'] },
      },
    });
  },
};
