'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  listWithFirstIntervention,
  listWithSubscriptions,
  listBySector,
  listWithBilledEvents,
  listWithCustomerContractSubscriptions,
  listWithIntervention,
  show,
  remove,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  getMandates,
  updateMandate,
  getCustomerQuotes,
  createCustomerQuote,
  uploadFile,
  deleteCertificates,
  getMandateSignatureRequest,
  saveSignedMandate,
  createHistorySubscription,
  createFunding,
  updateFunding,
  removeFunding,
} = require('../controllers/customerController');
const { FUNDING_FREQUENCIES, FUNDING_NATURES } = require('../models/Customer');
const {
  getCustomer,
  authorizeCustomerDelete,
  authorizeCustomerUpdate,
  authorizeCustomerGet,
} = require('./preHandlers/customers');
const { CIVILITY_OPTIONS } = require('../models/schemaDefinitions/identity');

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
              title: Joi.string().valid(CIVILITY_OPTIONS).required(),
              firstname: Joi.string().allow(null, ''),
              lastname: Joi.string().required(),
            }).required(),
            contact: Joi.object().keys({
              primaryAddress: Joi.object().keys({
                street: Joi.string().required(),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string().required(),
                location: Joi.object().keys({
                  type: Joi.string().required(),
                  coordinates: Joi.array().length(2).required(),
                }).required(),
              }).required(),
            }).required(),
          }),
        },
      },
      handler: create,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['customers:edit', 'customer-{params._id}'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            referent: Joi.objectId().allow(null, ''),
            identity: Joi.object().keys({
              title: Joi.string().valid(CIVILITY_OPTIONS),
              firstname: Joi.string().allow('', null),
              lastname: Joi.string(),
              birthDate: Joi.date(),
            }).min(1),
            email: Joi.string().email(),
            contact: Joi.object().keys({
              phone: Joi.string().allow('', null),
              primaryAddress: Joi.object().keys({
                street: Joi.string().required(),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string(),
                location: Joi.object().keys({
                  type: Joi.string(),
                  coordinates: Joi.array(),
                }),
              }),
              secondaryAddress: Joi.object().keys({
                street: Joi.string().allow('', null),
                zipCode: Joi.string().allow('', null),
                city: Joi.string().allow('', null),
                fullAddress: Joi.string().allow('', null),
                location: Joi.object().keys({
                  type: Joi.string().allow('', null),
                  coordinates: Joi.array().allow([], null),
                }),
              }),
              accessCodes: Joi.string().allow('', null),
            }).min(1),
            followUp: Joi.object().keys({
              environment: Joi.string().allow('', null),
              objectives: Joi.string().allow('', null),
              misc: Joi.string().allow('', null),
            }).min(1),
            payment: Joi.object().keys({
              bankAccountOwner: Joi.string(),
              iban: Joi.string(),
              bic: Joi.string(),
            }).min(1),
          }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['customers:read'] },
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
          query: Joi.object().keys({
            sector: Joi.array().items(Joi.string()),
            startDate: Joi.date(),
            endDate: Joi.date(),
          }),
        },
        pre: [{ method: authorizeCustomerGet }],
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
      path: '/customer-contract-subscriptions',
      options: {
        auth: { scope: ['customers:read'] },
      },
      handler: listWithCustomerContractSubscriptions,
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
          params: { _id: Joi.objectId().required() },
        },
        pre: [{ method: authorizeCustomerGet }],
      },
      handler: show,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['customers:create'] },
        validate: {
          params: { _id: Joi.objectId().required() },
        },
        pre: [
          { method: getCustomer, assign: 'customer' },
          { method: authorizeCustomerDelete },
        ],
      },
      handler: remove,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/subscriptions',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: { _id: Joi.objectId().required() },
          payload: {
            service: Joi.string().required(),
            versions: Joi.array().items({
              unitTTCRate: Joi.number().required(),
              estimatedWeeklyVolume: Joi.number().required(),
              evenings: Joi.number(),
              sundays: Joi.number(),
            }),
          },
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: addSubscription,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/subscriptions/{subscriptionId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            subscriptionId: Joi.objectId().required(),
          },
          payload: {
            unitTTCRate: Joi.number(),
            estimatedWeeklyVolume: Joi.number(),
            evenings: Joi.number(),
            sundays: Joi.number(),
          },
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: updateSubscription,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/subscriptions/{subscriptionId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            subscriptionId: Joi.objectId().required(),
          },
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: deleteSubscription,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/mandates',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
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
          params: {
            _id: Joi.objectId().required(),
            mandateId: Joi.objectId().required(),
          },
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: updateMandate,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/mandates/{mandateId}/esign',
      options: {
        auth: { scope: ['customer-{params._id}'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            mandateId: Joi.objectId().required(),
          },
          payload: {
            fileId: Joi.string().required(),
            customer: Joi.object().keys({
              name: Joi.string().required(),
              email: Joi.string().email().required(),
            }).required(),
            fields: Joi.object().required(),
            redirect: Joi.string(),
            redirectDecline: Joi.string(),
          },
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: getMandateSignatureRequest,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/quotes',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId(),
          },
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
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            subscriptions: Joi.array().items(Joi.object().keys({
              serviceName: Joi.string(),
              unitTTCRate: Joi.number(),
              estimatedWeeklyVolume: Joi.number(),
              evenings: Joi.number(),
              sundays: Joi.number(),
            })).required(),
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
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            driveId: Joi.string().required(),
          },
          payload: Joi.object({
            fileName: Joi.string().required(),
            file: Joi.any().required(),
            type: Joi.string().valid('signedQuote', 'signedMandate', 'financialCertificates').required(),
            quoteId: Joi.string().when(
              'type',
              { is: 'signedQuote', then: Joi.required(), otherwise: Joi.forbidden() }
            ),
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
          params: { _id: Joi.objectId().required() },
          payload: Joi.object().keys({
            driveId: Joi.string().required(),
          }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: deleteCertificates,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/mandates/{mandateId}/savesigneddoc',
      options: {
        auth: { scope: ['customer-{params._id}'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            mandateId: Joi.objectId().required(),
          },
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: saveSignedMandate,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/subscriptionshistory',
      options: {
        auth: { scope: ['customer-{params._id}'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            subscriptions: Joi.array().items(Joi.object().keys({
              service: Joi.string(),
              unitTTCRate: Joi.number(),
              estimatedWeeklyVolume: Joi.number(),
              evenings: Joi.number(),
              sundays: Joi.number(),
              startDate: Joi.date(),
            })).required(),
            helper: Joi.object().keys({
              firstname: Joi.string().allow(null, ''),
              lastname: Joi.string(),
              title: Joi.string().allow(null, ''),
            }).required(),
          }),
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: createHistorySubscription,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/fundings',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            nature: Joi.string().valid(FUNDING_NATURES).required(),
            thirdPartyPayer: Joi.objectId().required(),
            subscription: Joi.objectId().required(),
            frequency: Joi.string().valid(FUNDING_FREQUENCIES).required(),
            versions: Joi.array().items(Joi.object().keys({
              folderNumber: Joi.string(),
              startDate: Joi.date().required(),
              endDate: Joi.date(),
              amountTTC: Joi.number(),
              unitTTCRate: Joi.number(),
              careHours: Joi.number(),
              careDays: Joi.array().items(Joi.number().min(0).max(7)).required(),
              customerParticipationRate: Joi.number().default(0),
            })),
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
          params: {
            _id: Joi.objectId().required(),
            fundingId: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            subscription: Joi.objectId().required(),
            folderNumber: Joi.string(),
            endDate: Joi.date(),
            startDate: Joi.date().required(),
            amountTTC: Joi.number(),
            unitTTCRate: Joi.number(),
            careHours: Joi.number(),
            careDays: Joi.array().items(Joi.number().min(0).max(7)).required(),
            customerParticipationRate: Joi.number().default(0),
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
          params: {
            _id: Joi.objectId().required(),
            fundingId: Joi.objectId().required(),
          },
        },
        pre: [{ method: authorizeCustomerUpdate }],
      },
      handler: removeFunding,
    });
  },
};
