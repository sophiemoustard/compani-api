'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authenticate, create, list, show, update, remove, getPresentation, refreshToken
} = require('../controllers/userController');

exports.plugin = {
  name: 'routes-users',
  register: async (server) => {
    // Authenticate a user
    server.route({
      method: 'POST',
      path: '/authenticate',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            password: Joi.string().required()
          }).required()
        },
        auth: false
      },
      handler: authenticate
    });
    // Create a user
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            firstname: Joi.string(),
            lastname: Joi.string(),
            mobilePhone: Joi.string(),
            sector: Joi.string(),
            employee_id: Joi.number(),
            customer_id: Joi.number(),
            local: {
              email: Joi.string().email().required(),
              password: Joi.string().required()
            },
            role: Joi.string().required(),
            picture: Joi.object().keys({
              link: Joi.string()
            }).default({ link: 'https://res.cloudinary.com/alenvi/image/upload/c_scale,h_400,q_auto,w_400/v1513764284/images/users/default_avatar.png' })
          }).required()
        },
        auth: false
      },
      handler: create
    });
    // Get all users
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: {
            role: Joi.string(),
            email: Joi.string().email()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: list
    });
    // Get user by id
    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        auth: { strategy: 'jwt' }
      },
      handler: show
    });
    // Update user by id
    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        validate: {
          payload: Joi.object().keys({
            firstname: Joi.string(),
            lastname: Joi.string(),
            mobilePhone: Joi.string(),
            sector: Joi.string(),
            employee_id: Joi.number(),
            customer_id: Joi.number(),
            local: {
              email: Joi.string().email(),
              password: Joi.string()
            },
            role: Joi.string(),
            picture: Joi.object().keys({
              link: Joi.string()
            })
          }).required()
        },
        auth: { strategy: 'jwt' }
      },
      handler: update
    });
    // Delete user by id
    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: remove
    });
    // Get users presentation
    server.route({
      method: 'GET',
      path: '/presentation',
      options: {
        validate: {
          query: {
            role: Joi.string()
          }
        },
        auth: false
      },
      handler: getPresentation
    });
    // Post refresh token
    server.route({
      method: 'POST',
      path: '/refreshToken',
      options: {
        validate: {
          payload: {
            refreshToken: Joi.string().required()
          }
        },
        auth: false
      },
      handler: refreshToken
    });
  }
};
