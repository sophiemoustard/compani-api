'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  listWithSubscriptions,
  listBySector,
  listWithBilledEvents,
  listWithCustomerContractSubscriptions,
  show,
  remove,
  addSubscription,
  updateSubscription,
  removeSubscription,
  getMandates,
  updateMandate,
  createDriveFolder,
  getCustomerQuotes,
  createCustomerQuote,
  removeCustomerQuote,
  uploadFile,
  updateCertificates,
  generateMandateSignatureRequest,
  saveSignedMandate,
  createHistorySubscription,
  createFunding,
  updateFunding,
  removeFunding,
  removeSecondaryAddress,
} = require('../controllers/customerController');
const { FUNDING_FREQUENCIES, FUNDING_NATURES } = require('../models/Customer');
const { getCustomer, authorizeCustomerDelete } = require('./preHandlers/customers');
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
            }).min(1),
            contact: Joi.object().keys({
              primaryAddress: {
                street: Joi.string().required(),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string(),
                location: {
                  type: Joi.string(),
                  coordinates: Joi.array(),
                },
              },
              secondaryAddress: {
                street: Joi.string().allow('', null),
                zipCode: Joi.string().allow('', null),
                city: Joi.string().allow('', null),
                fullAddress: Joi.string().allow('', null),
                location: {
                  type: Joi.string().allow('', null),
                  coordinates: Joi.array().allow([], null),
                },
              },
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
            identity: Joi.object().keys({
              title: Joi.string().valid(CIVILITY_OPTIONS),
              firstname: Joi.string().allow('', null),
              lastname: Joi.string(),
              birthDate: Joi.date(),
            }).min(1),
            email: Joi.string().email(),
            contact: Joi.object().keys({
              phone: Joi.string().allow('', null),
              primaryAddress: {
                street: Joi.string().required(),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string(),
                location: {
                  type: Joi.string(),
                  coordinates: Joi.array(),
                },
              },
              secondaryAddress: {
                street: Joi.string().allow('', null),
                zipCode: Joi.string().allow('', null),
                city: Joi.string().allow('', null),
                fullAddress: Joi.string().allow('', null),
                location: {
                  type: Joi.string().allow('', null),
                  coordinates: Joi.array().allow([], null),
                },
              },
              accessCodes: Joi.string().allow('', null),
            }),
            followUp: Joi.object().keys({
              environment: Joi.string().allow('', null),
              objectives: Joi.string().allow('', null),
              misc: Joi.string().allow('', null),
            }),
            payment: Joi.object().keys({
              bankAccountOwner: Joi.string(),
              iban: Joi.string(),
              bic: Joi.string(),
            }),
          }),
        },
      },
      handler: update,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['customers:read'] },
        validate: {
          query: Joi.object().keys({
            _id: [Joi.array().items(Joi.objectId()), Joi.objectId()],
          }),
        },
      },
      handler: list,
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
      path: '/{_id}',
      options: {
        auth: { scope: ['customers:read', 'customer-{params._id}'] },
        validate: {
          params: { _id: Joi.objectId().required() },
        },
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
      },
      handler: updateSubscription,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/removesecaddress',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
        },
      },
      handler: removeSecondaryAddress,
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
      },
      handler: removeSubscription,
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
      },
      handler: generateMandateSignatureRequest,
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
      },
      handler: createCustomerQuote,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/quotes/{quoteId}',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            quoteId: Joi.objectId().required(),
          },
        },
      },
      handler: removeCustomerQuote,
    });


    server.route({
      method: 'POST',
      path: '/{_id}/drivefolder',
      options: {
        auth: { scope: ['customers:administrative:edit'] },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            parentFolderId: Joi.string(),
          }),
        },
      },
      handler: createDriveFolder,
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
            'Content-Type': Joi.string().required(),
            fileName: Joi.string().required(),
            signedQuote: Joi.any(),
            signedMandate: Joi.any(),
            financialCertificates: Joi.any(),
            quoteId: Joi.string().when(
              'signedQuote',
              { is: Joi.exist(), then: Joi.required(), otherwise: Joi.forbidden() }
            ),
            mandateId: Joi.string().when(
              'signedMandate',
              { is: Joi.exist(), then: Joi.required(), otherwise: Joi.forbidden() }
            ),
          }).or('signedQuote', 'signedMandate', 'financialCertificates'),
        },
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
            financialCertificates: Joi.object().keys({
              driveId: Joi.string().required(),
            }),
          }),
        },
      },
      handler: updateCertificates,
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
            versions: Joi.array().items(Joi.object().keys({
              folderNumber: Joi.string(),
              startDate: Joi.date().required(),
              endDate: Joi.date(),
              frequency: Joi.string().valid(FUNDING_FREQUENCIES).required(),
              amountTTC: Joi.number(),
              unitTTCRate: Joi.number(),
              careHours: Joi.number(),
              careDays: Joi.array().items(Joi.number().min(0).max(7)).required(),
              customerParticipationRate: Joi.number().default(0),
            })),
          }),
        },
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
            frequency: Joi.string().valid(FUNDING_FREQUENCIES).required(),
            amountTTC: Joi.number(),
            unitTTCRate: Joi.number(),
            careHours: Joi.number(),
            careDays: Joi.array().items(Joi.number().min(0).max(7)).required(),
            customerParticipationRate: Joi.number().default(0),
          }),
        },
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
      },
      handler: removeFunding,
    });
  },
};
