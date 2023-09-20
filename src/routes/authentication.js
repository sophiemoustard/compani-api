'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authenticate,
  logout,
  createPasswordToken,
  refreshToken,
  forgotPassword,
  sendToken,
  updatePassword,
} = require('../controllers/authenticationController');
const { WEBAPP, EMAIL, PHONE, MOBILE, ORIGIN_OPTIONS } = require('../helpers/constants');
const { getUser, authorizeUserUpdate } = require('./preHandlers/users');
const { checkPasswordToken, authorizeRefreshToken } = require('./preHandlers/authentication');

exports.plugin = {
  name: 'routes-authentication',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/authenticate',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
            origin: Joi.string().valid(...ORIGIN_OPTIONS),
          }).required(),
        },
        auth: false,
      },
      handler: authenticate,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/passwordtoken',
      options: {
        auth: { scope: ['users:edit', 'user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({ email: Joi.string().email().required() }),
        },
        pre: [
          { method: getUser, assign: 'user' },
          { method: authorizeUserUpdate },
        ],
      },
      handler: createPasswordToken,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/password',
      options: {
        auth: { scope: ['user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            local: Joi.object().keys({ password: Joi.string().min(6).required() }),
            isConfirmed: Joi.boolean(),
          }),
        },
      },
      handler: updatePassword,
    });

    server.route({
      method: 'POST',
      path: '/refreshToken',
      options: {
        auth: false,
        state: { parse: true, failAction: 'error' },
        pre: [{ method: authorizeRefreshToken }],
      },
      handler: refreshToken,
    });

    server.route({
      method: 'POST',
      path: '/logout',
      options: { auth: false },
      handler: logout,
    });

    server.route({
      method: 'POST',
      path: '/forgot-password',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            origin: Joi.string().valid(...ORIGIN_OPTIONS).default(WEBAPP),
            type: Joi.string().valid(PHONE, EMAIL)
              .when('origin', { is: MOBILE, then: Joi.required(), otherwise: Joi.forbidden() }),
          }),
        },
        auth: false,
      },
      handler: forgotPassword,
    });

    server.route({
      method: 'GET',
      path: '/passwordtoken/{token}',
      options: {
        validate: {
          params: Joi.object().keys({ token: Joi.string().required() }),
          query: Joi.alternatives().try(
            Joi.object({ email: Joi.string().email() }),
            Joi.object({
              firstname: Joi.string().required(),
              lastname: Joi.string().required(),
            })
          ),
        },
        auth: false,
        pre: [{ method: checkPasswordToken, assign: 'user' }],
      },
      handler: sendToken,
    });
  },
};
