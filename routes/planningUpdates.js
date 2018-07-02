'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list
} = require('../controllers/planningUpdateController');

exports.plugin = {
  name: 'routes-planning-updates',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            userId: Joi.string(),
          })
        },
        auth: 'jwt'
      },
      handler: list
    });

    // server.route({
    //   method: 'PUT',
    //   path: '/{_id}',
    //   options: {
    //     validate: {
    //       params: {
    //         _id: Joi.objectId()
    //       },
    //       payload: Joi.object().keys({
    //         name: Joi.string().optional(),
    //       }).required()
    //     },
    //     auth: {
    //       strategy: 'jwt',
    //       scope: ['Admin', 'Tech', 'Coach']
    //     }
    //   },
    //   handler: update
    // });

    // server.route({
    //   method: 'GET',
    //   path: '/',
    //   options: {
    //     validate: {
    //       query: Joi.object().keys({
    //         name: Joi.string()
    //       })
    //     },
    //     auth: 'jwt'
    //   },
    //   handler: showAll
    // });

    // server.route({
    //   method: 'GET',
    //   path: '/{_id}',
    //   options: {
    //     validate: {
    //       params: {
    //         _id: Joi.objectId().required()
    //       }
    //     },
    //     auth: 'jwt'
    //   },
    //   handler: showById
    // });

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
