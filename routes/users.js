'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authenticate,
  create,
  list,
  show,
  update,
  remove,
  getPresentation,
  refreshToken,
  forgotPassword,
  checkResetPasswordToken
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
            employee_id: Joi.string(),
            customer_id: Joi.string(),
            local: {
              email: Joi.string().email().required(),
              password: Joi.string().required()
            },
            managerId: Joi.objectId(),
            role: Joi.string().required(),
            picture: Joi.object().keys({
              link: Joi.string()
            }).default({ link: 'https://res.cloudinary.com/alenvi/image/upload/c_scale,h_400,q_auto,w_400/v1513764284/images/users/default_avatar.png' }),
            administrative: Joi.object().keys({
              signup: Joi.object().keys({
                firstSmsDate: Joi.string()
              })
            })
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
            _id: Joi.objectId(),
            firstname: Joi.string(),
            lastname: Joi.string(),
            mobilePhone: Joi.string(),
            sector: Joi.string(),
            employee_id: Joi.number(),
            customer_id: Joi.number(),
            facebook: Joi.object().keys({
              address: Joi.object()
            }),
            'local.email': Joi.string().email(), // bot special case
            local: {
              email: Joi.string().email(),
              password: Joi.string()
            },
            role: Joi.string(),
            picture: Joi.object().keys({
              link: Joi.string()
            }),
            resetPassword: Joi.object().keys({
              token: Joi.string().allow(null),
              expiresIn: Joi.number().allow(null),
              from: Joi.string().allow(null),
            }),
            administrative: {
              signup: {
                step: Joi.string(),
                complete: Joi.boolean()
              },
              mutualFund: {
                has: Joi.string(),
              },
              navigoInvoice: {
                has: Joi.string()
              },
              phoneInvoice: {
                has: Joi.string()
              },
              certificates: {
                has: Joi.string()
              },
              healthAttest: {
                has: Joi.string()
              },
              payment: {
                rib: {
                  iban: Joi.string(),
                  bic: Joi.string()
                }
              }
            },
            procedure: Joi.object().keys({
              _id: Joi.objectId(),
              name: Joi.string(),
              isDone: Joi.boolean()
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
          query: Joi.object().keys({
            role: [Joi.string(), Joi.array()],
            location: [Joi.string(), Joi.array()]
          })
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

    server.route({
      method: 'POST',
      path: '/forgotPassword',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            from: Joi.string().valid('p', 'w').default('w').required()
          })
        },
        auth: false
      },
      handler: forgotPassword
    });

    server.route({
      method: 'GET',
      path: '/checkResetPassword/{token}',
      options: {
        validate: {
          params: Joi.object().keys({
            token: Joi.string().required()
          })
        },
        auth: false
      },
      handler: checkResetPasswordToken
    });
  }
};
