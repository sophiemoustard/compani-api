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
  checkResetPasswordToken,
  updateCertificates,
  updateTask
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
            emergencyPhone: Joi.string(),
            sector: Joi.string(),
            employee_id: Joi.string(),
            customer_id: Joi.string(),
            local: {
              email: Joi.string().email().required(),
              password: Joi.string().required()
            },
            managerId: Joi.objectId(),
            ogustManagerId: Joi.string(),
            role: Joi.string().required(),
            picture: Joi.object().keys({
              link: Joi.string()
            }).default({ link: 'https://res.cloudinary.com/alenvi/image/upload/c_scale,h_400,q_auto,w_400/v1513764284/images/users/default_avatar.png' }),
            administrative: Joi.object().keys({
              signup: Joi.object().keys({
                firstSmsDate: Joi.string()
              }),
              identity: Joi.object().keys({
                title: Joi.string(),
                nationality: Joi.string(),
                dateOfBirth: Joi.string(),
                birthContry: Joi.string(),
                birthState: Joi.string(),
                birthCity: Joi.string(),
                socialSecurityNumber: Joi.number()
              }),
              contact: Joi.object().keys({
                address: Joi.string(),
                additionalAddress: Joi.string(),
                zipCode: Joi.string(),
                city: Joi.string()
              }),
              emergencyContact: Joi.object().keys({
                name: Joi.string(),
                phoneNumber: Joi.string()
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
            email: Joi.string().email(),
            sector: Joi.string(),
            isActive: Joi.boolean()
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
            emergencyPhone: Joi.string(),
            sector: Joi.string(),
            employee_id: Joi.number(),
            customer_id: Joi.number(),
            isConstrained: Joi.boolean(),
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
            mentorId: Joi.objectId(),
            administrative: {
              signup: {
                step: Joi.string(),
                complete: Joi.boolean()
              },
              identityDocs: Joi.string().valid('pp', 'cni', 'ts'),
              mutualFund: {
                has: Joi.boolean(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              navigoInvoice: {
                has: Joi.string(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              transportInvoice: {
                type: Joi.string(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              phoneInvoice: {
                has: Joi.string(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              certificates: {
                has: Joi.string()
              },
              healthAttest: {
                has: Joi.string(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              idCardRecto: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              idCardVerso: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              passport: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              residencePermit: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              socialSecurityNumber: Joi.number(),
              payment: {
                rib: {
                  iban: Joi.string(),
                  bic: Joi.string()
                }
              },
              contracts: Joi.object().keys({
                contractId: Joi.string(),
                creationDate: Joi.string(),
                startDate: Joi.string(),
                endDate: Joi.string(),
                contractType: Joi.string(),
                status: Joi.string(),
                motiveEntry: Joi.string(),
                collectiveConvention: Joi.string(),
                nature: Joi.string(),
                nature2: Joi.string(),
                specificity: Joi.string(),
                regime: Joi.string(),
                socialCategory: Joi.string(),
                description: Joi.string(),
                contractHours: Joi.string(),
                contractualSalary: Joi.string(),
                due: Joi.string()
              }),
              identity: Joi.object().keys({
                nationality: Joi.string(),
                dateOfBirth: Joi.string(),
                birthCountry: Joi.string(),
                birthState: Joi.string(),
                birthCity: Joi.string(),
                socialSecurityNumber: Joi.number()
              }),
              contact: Joi.object().keys({
                address: Joi.string(),
                additionalAddress: Joi.string().allow(''),
                zipCode: Joi.string(),
                city: Joi.string()
              }),
              emergencyContact: Joi.object().keys({
                name: Joi.string(),
                phoneNumber: Joi.string()
              })
            },
            procedure: Joi.object().keys({
              _id: Joi.objectId(),
              name: Joi.string(),
              isDone: Joi.boolean()
            }),
            isActive: Joi.boolean()
          }).required()
        },
        auth: { strategy: 'jwt' }
      },
      handler: update
    });
    // Update user certificates
    server.route({
      method: 'PUT',
      path: '/{_id}/certificates',
      options: {
        validate: {
          params: {
            _id: Joi.objectId()
          },
          payload: Joi.object().keys({
            _id: Joi.objectId(),
            'administrative.certificates': {
              driveId: Joi.string()
            }
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: updateCertificates
    });
    server.route({
      method: 'PUT',
      path: '/{user_id}/tasks/{task_id}',
      options: {
        validate: {
          params: {
            user_id: Joi.objectId(),
            task_id: Joi.objectId()
          },
          payload: Joi.object().keys({
            isDone: Joi.boolean(),
            user_id: Joi.objectId(),
            task_id: Joi.objectId()
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: updateTask
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
