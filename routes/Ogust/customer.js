'use strict';

const Joi = require('joi');

const {
  list,
  getById,
  updateById,
  getThirdPartyInformation,
  editThirdPartyInformation,
  getCustomerServices,
  getCustomerFiscalAttests,
  getCustomerInvoices,
  getCustomerContacts
} = require('../../controllers/Ogust/customerController');

exports.plugin = {
  name: 'routes-ogust-customers',
  register: async (server) => {
    // Get all customers
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: {
            email: Joi.string().email(),
            status: Joi.string().default('A'),
            last_name: Joi.string(),
            sector: Joi.string(),
            nbperpage: Joi.number().default(50),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: list
    });
    // Get customer by id
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() }
        },
        auth: false
      },
      handler: getById
    });
    // Update customer by id
    server.route({
      method: 'PUT',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          payload: Joi.object().keys({
            last_name: Joi.string(),
            first_name: Joi.string(),
            email: Joi.string().email(),
            mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/),
            door_code: Joi.strict(),
            intercom_code: Joi.string(),
            landline: Joi.string()
          }).required()
        },
        auth: false
      },
      handler: updateById
    });
    // Get customer services
    server.route({
      method: 'GET',
      path: '/{id}/services',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            idCustomer: Joi.string(),
            isRange: Joi.string().default('false'),
            isDate: Joi.string().default('false'),
            slotToSub: Joi.number(),
            slotToAdd: Joi.number(),
            intervalType: Joi.string(),
            startDate: Joi.number(),
            endDate: Joi.number(),
            status: Joi.string().default('@!=|N'),
            type: Joi.string().default('I'),
            nbperpage: Joi.number().default(100),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getCustomerServices
    });
    // Get customer third party information
    server.route({
      method: 'GET',
      path: '/{id}/moreInfo',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            third_party: Joi.string().default('C'),
            nbperpage: Joi.number().default(10),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getThirdPartyInformation
    });
    // Get customer fiscal attests
    server.route({
      method: 'GET',
      path: '/{id}/fiscalAttests',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            status: Joi.string().default('E'),
            year: Joi.string().default(new Date().getFullYear()),
            nbperpage: Joi.number().default(24),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getCustomerFiscalAttests
    });
    // Get customer invoices
    server.route({
      method: 'GET',
      path: '/{id}/invoices',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            year: Joi.string(),
            month: Joi.string(),
            startPeriod: Joi.string(),
            endPeriod: Joi.string(),
            status: Joi.string().default('E'),
            nbperpage: Joi.number().default(50),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: getCustomerInvoices
    });
    // Edit customer third party information
    server.route({
      method: 'PUT',
      path: '/{id}/moreInfo',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() },
          query: {
            third_party: Joi.string().default('C')
          },
          payload: Joi.object().keys({
            arrayValues: Joi.object()
          })
        },
        auth: false
      },
      handler: editThirdPartyInformation
    });
    // Get customer contacts
    server.route({
      method: 'GET',
      path: '/{id}/contacts',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() }
        },
        auth: false
      },
      handler: getCustomerContacts
    });
  },
};

