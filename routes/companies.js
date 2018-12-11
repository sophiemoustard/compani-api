
'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  update,
  list,
  show,
  remove,
  uploadFile,
  createCompanyService,
  getCompanyServices,
  deleteCompanyService,
  updateCompanyService,
} = require('../controllers/companyController');

exports.plugin = {
  name: 'routes-companies',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().required(),
            rhConfig: Joi.object().keys({
              providerContracts: {
                grossHourlyRate: Joi.number()
              },
              agentContracts: {
                grossHourlyRate: Joi.number()
              },
              phoneSubRefunding: Joi.number(),
              transportSubs: Joi.array().items({
                department: Joi.string(),
                price: Joi.number()
              }),
              contractTemplate: {
                id: Joi.string(),
                link: Joi.string()
              }
            })
          })
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
        }
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
            name: Joi.string(),
            address: Joi.object().keys({
              street: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required(),
              fullAddress: Joi.string(),
              location: {
                type: Joi.string(),
                coordinates: Joi.array()
              }
            }),
            ics: Joi.string(),
            rcs: Joi.string(),
            rhConfig: Joi.object().keys({
              providerContracts: {
                grossHourlyRate: Joi.number()
              },
              agentContracts: {
                grossHourlyRate: Joi.number()
              },
              phoneSubRefunding: Joi.number(),
              transportSubs: [Joi.array().items({
                department: Joi.string(),
                price: Joi.number()
              }), Joi.object().keys({
                subId: Joi.objectId().required(),
                price: Joi.number()
              })],
              templates: {
                contract: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null)
                },
                amendment: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null)
                }
              },
            }),
            customersConfig: Joi.object().keys({
              templates: {
                debitMandate: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null)
                },
                quote: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null)
                },
              },
            }),
          })
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
        }
      },
      handler: update
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            name: Joi.string(),
          })
        },
        auth: 'jwt'
      },
      handler: list
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
      method: 'POST',
      path: '/{_id}/services',
      handler: createCompanyService,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: { _id: Joi.objectId().required() },
          payload: Joi.object().keys({
            defaultUnitAmount: Joi.number().required(),
            eveningSurcharge: Joi.number().allow('', null),
            holidaySurcharge: Joi.number().allow('', null),
            name: Joi.string().required(),
            nature: Joi.string().required(),
            vat: Joi.number().required(),
          }),
        },
      },
    });

    server.route({
      method: 'GET',
      path: '/{_id}/services',
      handler: getCompanyServices,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: { _id: Joi.objectId().required() },
        },
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/services/{serviceId}',
      handler: deleteCompanyService,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            serviceId: Joi.objectId().required()
          },
        },
      },
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/services/{serviceId}',
      handler: updateCompanyService,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            serviceId: Joi.objectId().required()
          },
          payload: Joi.object().keys({
            defaultUnitAmount: Joi.number(),
            eveningSurcharge: Joi.number().allow('', null),
            holidaySurcharge: Joi.number().allow('', null),
            name: Joi.string(),
            nature: Joi.string(),
            vat: Joi.number(),
          }),
        },
      },
    });
  }
};
