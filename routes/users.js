'use strict';

const Joi = require('joi');

const { authenticate, create } = require('../controllers/userController');

exports.plugin = {
  name: 'routes-users',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/authenticate',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            password: Joi.string().required()
          })
        },
        auth: false
      },
      handler: authenticate
    });

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
          })
        },
        auth: false
      },
      handler: create
    });
  }
};
