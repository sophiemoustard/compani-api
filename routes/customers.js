'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  listBySector,
  listWithBilledEvents,
  listWithCustomerContractSubscriptions,
  show,
  remove,
  getSubscriptions,
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
  getFundings,
  removeFunding
} = require('../controllers/customerController');

const {
  MONTHLY,
  ONCE,
  HOURLY,
  FIXED
} = require('../helpers/constants');

exports.plugin = {
  name: 'routes-customers',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            identity: {
              title: Joi.string(),
              firstname: Joi.string().allow(null, ''),
              lastname: Joi.string().required()
            },
            contact: Joi.object().keys({
              address: {
                street: Joi.string().required(),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string(),
                location: {
                  type: Joi.string(),
                  coordinates: Joi.array()
                }
              }
            }).required(),
            isActive: Joi.boolean().default(true)
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: create
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          },
          payload: Joi.object().keys({
            _id: Joi.objectId(),
            identity: {
              title: Joi.string(),
              firstname: Joi.string().allow('', null),
              lastname: Joi.string(),
              birthDate: Joi.date()
            },
            email: Joi.string().email(),
            contact: Joi.object().keys({
              phone: Joi.string().allow('', null),
              address: {
                street: Joi.string().required(),
                additionalAddress: Joi.string().allow('', null),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string(),
                location: {
                  type: Joi.string(),
                  coordinates: Joi.array()
                }
              },
              doorCode: Joi.string(),
              intercomCode: Joi.string()
            }),
            followUp: Joi.object().keys({
              pathology: Joi.string(),
              comments: Joi.string(),
              details: Joi.string(),
              misc: Joi.string(),
              referent: Joi.string()
            }),
            payment: Joi.object().keys({
              bankAccountOwner: Joi.string(),
              iban: Joi.string(),
              bic: Joi.string()
            }),
            isActive: Joi.boolean()
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: update
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            firstname: Joi.string(),
            lastname: Joi.string(),
            isActive: Joi.boolean(),
            sectors: Joi.array().items(Joi.string()),
            subscriptions: Joi.boolean(),
            _id: [Joi.array().items(Joi.objectId()), Joi.objectId()],
          })
        },
        auth: 'jwt'
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/sectors',
      options: {
        validate: {
          query: Joi.object().keys({
            sector: Joi.array().items(Joi.string()),
            startDate: Joi.string(),
            endDate: Joi.string(),
          })
        },
        auth: 'jwt'
      },
      handler: listBySector,
    });

    server.route({
      method: 'GET',
      path: '/billed-events',
      options: {
        validate: {},
        auth: 'jwt'
      },
      handler: listWithBilledEvents,
    });

    server.route({
      method: 'GET',
      path: '/customer-contract-subscriptions',
      options: {
        auth: 'jwt'
      },
      handler: listWithCustomerContractSubscriptions,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          }
        },
        auth: 'jwt'
      },
      handler: show
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          }
        },
        auth: 'jwt'
      },
      handler: remove
    });

    server.route({
      method: 'GET',
      path: '/{_id}/subscriptions',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          }
        },
        auth: 'jwt',
      },
      handler: getSubscriptions,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/subscriptions',
      options: {
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
          }
        },
        auth: 'jwt',
      },
      handler: addSubscription,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/subscriptions/{subscriptionId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            subscriptionId: Joi.objectId().required()
          },
          payload: {
            unitTTCRate: Joi.number(),
            estimatedWeeklyVolume: Joi.number(),
            evenings: Joi.number(),
            sundays: Joi.number(),
          }
        },
        auth: 'jwt',
      },
      handler: updateSubscription,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/subscriptions/{subscriptionId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            subscriptionId: Joi.objectId().required()
          }
        },
        auth: 'jwt',
      },
      handler: removeSubscription,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/mandates',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
          }
        },
        auth: 'jwt',
      },
      handler: getMandates,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/mandates/{mandateId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            mandateId: Joi.objectId().required()
          }
        },
        auth: 'jwt',
      },
      handler: updateMandate,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/mandates/{mandateId}/esign',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            mandateId: Joi.objectId().required()
          },
          payload: {
            fileId: Joi.string().required(),
            customer: Joi.object().keys({
              name: Joi.string().required(),
              email: Joi.string().email().required()
            }).required(),
            fields: Joi.object().required(),
            redirect: Joi.string(),
            redirectDecline: Joi.string()
          }
        },
        auth: {
          strategy: 'jwt'
        }
      },
      handler: generateMandateSignatureRequest
    });

    server.route({
      method: 'GET',
      path: '/{_id}/quotes',
      options: {
        validate: {
          params: {
            _id: Joi.objectId()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: getCustomerQuotes
    });

    server.route({
      method: 'POST',
      path: '/{_id}/quotes',
      options: {
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
              sundays: Joi.number()
            })).required()
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: createCustomerQuote
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/quotes/{quoteId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            quoteId: Joi.objectId().required()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: removeCustomerQuote
    });


    server.route({
      method: 'POST',
      path: '/{_id}/drivefolder',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          },
          payload: Joi.object().keys({
            parentFolderId: Joi.string()
          })
        },
        auth: {
          strategy: 'jwt'
        }
      },
      handler: createDriveFolder,
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

    server.route({
      method: 'PUT',
      path: '/{_id}/certificates',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() },
          payload: Joi.object().keys({
            financialCertificates: Joi.object().keys({
              driveId: Joi.string().required(),
            }),
          })
        },
        auth: { strategy: 'jwt' },
      },
      handler: updateCertificates,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/mandates/{mandateId}/savesigneddoc',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            mandateId: Joi.objectId().required()
          }
        },
        auth: 'jwt',
      },
      handler: saveSignedMandate
    });

    server.route({
      method: 'POST',
      path: '/{_id}/subscriptionshistory',
      options: {
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
            }).required()
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: createHistorySubscription
    });

    server.route({
      method: 'POST',
      path: '/{_id}/fundings',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            nature: Joi.string().valid(HOURLY, FIXED).required(),
            thirdPartyPayer: Joi.objectId().required(),
            subscription: Joi.objectId().required(),
            versions: Joi.array().items(Joi.object().keys({
              folderNumber: Joi.string(),
              startDate: Joi.date().required(),
              endDate: Joi.date(),
              frequency: Joi.string().valid(MONTHLY, ONCE).required(),
              amountTTC: Joi.number(),
              unitTTCRate: Joi.number(),
              careHours: Joi.number(),
              careDays: Joi.array().items(Joi.number().min(0).max(7)).required(),
              customerParticipationRate: Joi.number().default(0),
            }))
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: createFunding
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/fundings/{fundingId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            fundingId: Joi.objectId().required()
          },
          payload: Joi.object().keys({
            subscription: Joi.objectId().required(),
            folderNumber: Joi.string(),
            endDate: Joi.date(),
            startDate: Joi.date().required(),
            frequency: Joi.string().valid(MONTHLY, ONCE).required(),
            amountTTC: Joi.number(),
            unitTTCRate: Joi.number(),
            careHours: Joi.number(),
            careDays: Joi.array().items(Joi.number().min(0).max(7)).required(),
            customerParticipationRate: Joi.number().default(0),
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: updateFunding
    });

    server.route({
      method: 'GET',
      path: '/{_id}/fundings',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required()
          }
        },
        auth: 'jwt',
      },
      handler: getFundings,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/fundings/{fundingId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            fundingId: Joi.objectId().required()
          }
        },
        auth: 'jwt',
      },
      handler: removeFunding,
    });
  }
};
