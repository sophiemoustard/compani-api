'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  // update,
  list,
  show,
  // remove,
} = require('../controllers/customerController');

exports.plugin = {
  name: 'routes-customers',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            firstname: Joi.string().required(),
            lastname: Joi.string().required(),
            contact: Joi.object().keys({
              address: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required()
            }).required()
          })
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
        }
      },
      handler: create
    });

    // server.route({
    //   method: 'PUT',
    //   path: '/{_id}',
    //   options: {
    //     validate: {
    //       params: {
    //         _id: Joi.objectId().required()
    //       },
    //       payload: Joi.object().keys({
    //         _id: Joi.objectId(),
    //         name: Joi.string(),
    //         rhConfig: Joi.object().keys({
    //           providerContracts: {
    //             grossHourlyRate: Joi.number()
    //           },
    //           agentContracts: {
    //             grossHourlyRate: Joi.number()
    //           },
    //           phoneSubRefunding: Joi.number(),
    //           transportSubs: [Joi.array().items({
    //             department: Joi.string(),
    //             price: Joi.number()
    //           }), Joi.object().keys({
    //             subId: Joi.objectId().required(),
    //             price: Joi.number()
    //           })],
    //           contractTemplate: {
    //             id: Joi.string().allow(null),
    //             link: Joi.string().allow(null)
    //           }
    //         })
    //       })
    //     },
    //     auth: {
    //       strategy: 'jwt',
    //       // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
    //     }
    //   },
    //   handler: update
    // });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            firstname: Joi.string(),
            lastname: Joi.string()
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

    // server.route({
    //   method: 'DELETE',
    //   path: '/{_id}',
    //   options: {
    //     validate: {
    //       params: {
    //         _id: Joi.objectId().required()
    //       }
    //     },
    //     auth: 'jwt'
    //   },
    //   handler: remove
    // });
  }
};
