'use strict';

const Joi = require('joi');
const Boom = require('boom');

const {
  list,
  getById,
  updateById,
  create,
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
            nbperpage: Joi.number().default(100),
            pagenum: Joi.number().default(1)
          },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
          params: { id: Joi.string() },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
            first_name: Joi.string().allow('', null),
            email: Joi.string().email(),
            mobile_phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/).allow('', null),
            door_code: Joi.string().allow(null, ''),
            intercom_code: Joi.string().allow(null, ''),
            landline: Joi.string(),
            date_of_birth: Joi.string()
          }).required(),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: false
      },
      handler: updateById
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            title: Joi.string().required(),
            last_name: Joi.string().required(),
            first_name: Joi.string(),
            origin: Joi.string().default('253195735'),
            method_of_payment: Joi.string().default('112539'),
            manager: Joi.string().default('302007671'),
            type: Joi.string().default('C'),
            exoneration: Joi.string().default('D'),
            main_address: Joi.object().keys({
              line: Joi.string(),
              supplement: Joi.string(),
              zip: Joi.string(),
              city: Joi.string(),
              type: Joi.string().default('Adrpri'),
              country: Joi.string().default('FR')
            }).required()
          }).required(),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: false
      },
      handler: create
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
            isRange: Joi.boolean().default(false),
            isDate: Joi.boolean().default(false),
            slotToSub: Joi.number(),
            slotToAdd: Joi.number(),
            intervalType: Joi.string(),
            startDate: Joi.number(),
            endDate: Joi.number(),
            status: Joi.string().default('@!=|N'),
            type: Joi.string().default('I'),
            nbperpage: Joi.number().default(100),
            pagenum: Joi.number().default(1)
          },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
            year: Joi.string(),
            nbperpage: Joi.number().default(24),
            pagenum: Joi.number().default(1)
          },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
          },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
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
          params: { id: Joi.string() },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: false
      },
      handler: getCustomerContacts
    });
  },
};

