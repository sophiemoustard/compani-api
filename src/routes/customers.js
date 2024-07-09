'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  listWithFirstIntervention,
  listWithSubscriptions,
  listBySector,
  listWithBilledEvents,
  listWithIntervention,
  show,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  getMandates,
  updateMandate,
  getCustomerQuotes,
  createCustomerQuote,
  uploadFile,
  deleteCertificates,
  createFunding,
  updateFunding,
  deleteFunding,
  getQRCode,
} = require('../controllers/customerController');
const { FUNDING_FREQUENCIES, FUNDING_NATURES } = require('../models/Customer');
const {
  authorizeCustomerUpdate,
  authorizeFundingDeletion,
  authorizeCustomerGet,
  authorizeCustomerGetBySector,
  authorizeSubscriptionCreation,
  authorizeSubscriptionUpdate,
  authorizeSubscriptionDeletion,
} = require('./preHandlers/customers');
const { CIVILITY_OPTIONS } = require('../models/schemaDefinitions/identity');
const { addressValidation, objectIdOrArray, formDataPayload } = require('./validations/utils');
const { fundingValidation } = require('./validations/customer');

exports.plugin = {
  name: 'routes-customers',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['customers:create'] },
        validate: {
          payload: Joi.object().keys({
            identity: Joi.object().keys({
              title: Joi.string().valid(...CIVILITY_OPTIONS).required(),
              firstname: Joi.string().allow(null, ''),
              lastname: Joi.string().required(),
            }).required(),
            contact: Joi.object().keys({ primaryAddress: addressValidation.required() }).required(),
          }),
        },
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['customers:read'] },
        validate: { query: Joi.object({ archived: Joi.boolean(), stopped: Joi.boolean() }) },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/first-intervention',
      options: {
        auth: { scope: ['customers:read'] },
      },
      handler: listWithFirstIntervention,
    });

    server.route({
      method: 'GET',
      path: '/subscriptions',
      options: {
        auth: { scope: ['customers:read'] },
      },
      handler: listWithSubscriptions,
    });

    server.route({
      method: 'GET',
      path: '/sectors',
      options: {
        auth: { scope: ['customers:read'] },
        validate: {
          query: Joi.object().keys({ sector: objectIdOrArray, startDate: Joi.date(), endDate: Joi.date() }),
        },
        pre: [{ method: authorizeCustomerGetBySector }],
      },
      handler: listBySector,
    });

    server.route({
      method: 'GET',
      path: '/billed-events',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
      },
      handler: listWithBilledEvents,
    });

    server.route({
      method: 'GET',
      path: '/with-intervention',
      options: {
        auth: { scope: ['events:read'] },
      },
      handler: listWithIntervention,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        auth: { scope: ['customers:read', 'customer-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeCustomerGet }],
      },
      handler: show,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/qrcode',
      options: {
        auth: { scope: ['customers:read', 'customer-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeCustomerGet }],
      },
      handler: getQRCode,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/subscriptions',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({
            service: Joi.string().required(),
            versions: Joi.array().items(Joi.object({
              unitTTCRate: Joi.number().min(0).required(),
              weeklyHours: Joi.number().min(0),
              weeklyCount: Joi.number().integer().min(0),
              evenings: Joi.number().min(0),
              saturdays: Joi.number().min(0),
              sundays: Joi.number().min(0),
            }).or('weeklyHours', 'weeklyCount')),
          }),
        },
        pre: [{ method: authorizeSubscriptionCreation }],
      },
      handler: addSubscription,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/subscriptions/{subscriptionId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), subscriptionId: Joi.objectId().required() }),
          payload: Joi.object({
            unitTTCRate: Joi.number().min(0).required(),
            weeklyHours: Joi.number().min(0),
            weeklyCount: Joi.number().integer().min(0),
            evenings: Joi.number().min(0),
            saturdays: Joi.number().min(0),
            sundays: Joi.number().min(0),
          }).or('weeklyHours', 'weeklyCount'),
        },
        pre: [{ method: authorizeSubscriptionUpdate }],
      },
      handler: updateSubscription,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/subscriptions/{subscriptionId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), subscriptionId: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeSubscriptionDeletion }],
      },
      handler: deleteSubscription,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/mandates',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeCustomerGet }],
      },
      handler: getMandates,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/mandates/{mandateId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), mandateId: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: updateMandate,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/quotes',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeCustomerGet }],
      },
      handler: getCustomerQuotes,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/quotes',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            subscriptions: Joi.array().items(Joi.object().keys({
              service: Joi.object().keys({
                name: Joi.string().required(),
                nature: Joi.string().required(),
                surcharge: Joi.object().keys({ evening: Joi.number(), sunday: Joi.number() }),
              }).required(),
              unitTTCRate: Joi.number().min(0),
              weeklyHours: Joi.number().min(0),
              weeklyCount: Joi.number().integer().min(0),
              evenings: Joi.number().min(0),
              saturdays: Joi.number().min(0),
              sundays: Joi.number().min(0),
              billingItemsTTCRate: Joi.number().min(0),
              serviceBillingItems: Joi.array().items(Joi.string()),
            }).or('weeklyHours', 'weeklyCount')).required(),
          }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: createCustomerQuote,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        auth: { scope: ['customers:administrative:edit', 'customer-{params._id}'] },
        payload: formDataPayload(),
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), driveId: Joi.string().required() }),
          payload: Joi.object({
            fileName: Joi.string().required(),
            file: Joi.any().required(),
            type: Joi.string().valid('signedQuote', 'signedMandate', 'financialCertificates').required(),
            quoteId: Joi.string().when('type', { is: 'signedQuote', then: Joi.required(), otherwise: Joi.forbidden() }),
            mandateId: Joi.string().when(
              'type',
              { is: 'signedMandate', then: Joi.required(), otherwise: Joi.forbidden() }
            ),
          }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/certificates',
      options: {
        auth: { scope: ['customers:administrative:edit', 'customer-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({ driveId: Joi.string().required() }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: deleteCertificates,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/fundings',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            nature: Joi.string().valid(...FUNDING_NATURES).required(),
            thirdPartyPayer: Joi.objectId().required(),
            subscription: Joi.objectId().required(),
            frequency: Joi.string().valid(...FUNDING_FREQUENCIES).required(),
            versions: Joi.array().items(Joi.object().keys({ ...fundingValidation })),
          }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: createFunding,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/fundings/{fundingId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), fundingId: Joi.objectId().required() }),
          payload: Joi.object().keys({
            subscription: Joi.objectId().required(),
            ...fundingValidation,
          }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: updateFunding,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/fundings/{fundingId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), fundingId: Joi.objectId().required() }),
        },
        pre: [{ method: authorizeCustomerUpdate }, { method: authorizeFundingDeletion }],
      },
      handler: deleteFunding,
    });
  },
};
