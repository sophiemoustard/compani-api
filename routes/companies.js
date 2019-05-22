
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
  addInternalHour,
  updateInternalHour,
  getInternalHours,
  removeInternalHour,
} = require('../controllers/companyController');

const { TWO_WEEKS, MONTH } = require('../helpers/constants');

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
              contractWithCompany: {
                grossHourlyRate: Joi.number()
              },
              contractWithCustomer: {
                grossHourlyRate: Joi.number()
              },
              phoneSubRefunding: Joi.number(),
              transportSubs: Joi.array().items({
                department: Joi.string(),
                price: Joi.number(),
              })
            }),
            customersConfig: Joi.object().keys({
              billingPeriod: Joi.string().valid(TWO_WEEKS, MONTH),
            })
          })
        },
        auth: { strategy: 'jwt' },
      },
      handler: create
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
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
                coordinates: Joi.array(),
              }
            }),
            ics: Joi.string(),
            rcs: Joi.string(),
            iban: Joi.string(),
            bic: Joi.string(),
            rhConfig: Joi.object().keys({
              contractWithCompany: {
                grossHourlyRate: Joi.number(),
              },
              contractWithCustomer: {
                grossHourlyRate: Joi.number(),
              },
              phoneSubRefunding: Joi.number(),
              amountPerKm: Joi.number(),
              transportSubs: [Joi.array().items({
                department: Joi.string(),
                price: Joi.number(),
              }), Joi.object().keys({
                subId: Joi.objectId().required(),
                price: Joi.number(),
              })],
              templates: {
                contractWithCompany: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                contractWithCompanyVersion: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                contractWithCustomer: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                contractWithCustomerVersion: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                }
              },
            }),
            customersConfig: Joi.object().keys({
              billingPeriod: Joi.string().valid(TWO_WEEKS, MONTH),
              templates: {
                debitMandate: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
                quote: {
                  driveId: Joi.string().allow(null),
                  link: Joi.string().allow(null),
                },
              },
            }),
          })
        },
        auth: { strategy: 'jwt' },
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
      path: '/{_id}/internalHours',
      handler: addInternalHour,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string().required(),
            default: Joi.boolean(),
          })
        },
      }
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/internalHours/{internalHourId}',
      handler: updateInternalHour,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            internalHourId: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            name: Joi.string(),
            default: Joi.boolean(),
          })
        },
      }
    });

    server.route({
      method: 'GET',
      path: '/{_id}/internalHours',
      handler: getInternalHours,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: { _id: Joi.objectId().required() },
        }
      }
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/internalHours/{internalHourId}',
      handler: removeInternalHour,
      options: {
        auth: { strategy: 'jwt' },
        validate: {
          params: {
            _id: Joi.objectId().required(),
            internalHourId: Joi.objectId().required(),
          }
        },
      }
    });
  }
};
