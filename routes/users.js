'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authenticate,
  create,
  list,
  activeList,
  show,
  update,
  remove,
  getPresentation,
  refreshToken,
  forgotPassword,
  checkResetPasswordToken,
  updateCertificates,
  updateTask,
  getUserTasks,
  uploadFile,
  uploadImage,
  createDriveFolder,
  getUserAbsences,
  updateUserAbsence,
  createUserAbsence,
  removeUserAbsence
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
            mobilePhone: Joi.string(),
            emergencyPhone: Joi.string(),
            sector: Joi.objectId(),
            local: {
              email: Joi.string().email().required(),
              password: Joi.string().required()
            },
            role: Joi.string().required(),
            picture: Joi.object().keys({
              link: Joi.string()
            }),
            identity: Joi.object().keys({
              firstname: Joi.string(),
              lastname: Joi.string(),
              title: Joi.string(),
              nationality: Joi.string(),
              birthDate: Joi.date(),
              birthContry: Joi.string(),
              birthState: Joi.string(),
              birthCity: Joi.string(),
              socialSecurityNumber: Joi.number()
            }),
            contact: Joi.object().keys({
              address: {
                street: Joi.string().required(),
                additionalAddress: Joi.string().allow('', null),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string(),
                location: {
                  type: Joi.string(),
                  coordinates: Joi.array()
                }
              },
            }),
            administrative: Joi.object().keys({
              signup: Joi.object().keys({
                firstSmsDate: Joi.string()
              }),
              emergencyContact: Joi.object().keys({
                name: Joi.string(),
                phoneNumber: Joi.string()
              }),
              transportInvoice: Joi.object().keys({
                transportType: Joi.string()
              })
            }),
            customers: Joi.array(),
            company: Joi.string().required(),
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
            role: [Joi.array(), Joi.string()],
            email: Joi.string().email(),
            sector: Joi.objectId(),
            customers: Joi.objectId()
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: list,
    });

    // Get all active users
    server.route({
      method: 'GET',
      path: '/active',
      options: {
        validate: {
          query: {
            role: [Joi.array(), Joi.string()],
            email: Joi.string().email(),
            sector: Joi.objectId(),
            customers: Joi.objectId()
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: activeList,
    });

    // Get user by id
    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        auth: { strategy: 'jwt' },
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
            mobilePhone: Joi.string(),
            emergencyPhone: Joi.string(),
            sector: Joi.objectId(),
            isConstrained: Joi.boolean(),
            facebook: Joi.object().keys({
              address: Joi.object()
            }),
            'local.email': Joi.string().email(), // bot special case
            local: {
              email: Joi.string().email(),
              password: Joi.string()
            },
            role: Joi.objectId(),
            picture: Joi.object().keys({
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null)
            }),
            resetPassword: Joi.object().keys({
              token: Joi.string().allow(null),
              expiresIn: Joi.number().allow(null),
              from: Joi.string().allow(null),
            }),
            mentor: Joi.string().allow('', null),
            identity: Joi.object().keys({
              firstname: Joi.string(),
              lastname: Joi.string(),
              nationality: Joi.string(),
              birthDate: Joi.date(),
              birthCountry: Joi.string(),
              birthState: Joi.string(),
              birthCity: Joi.string(),
              socialSecurityNumber: Joi.number()
            }),
            contact: Joi.object().keys({
              address: {
                street: Joi.string().required(),
                additionalAddress: Joi.string().allow('', null),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string(),
                location: {
                  type: Joi.string(),
                  coordinates: Joi.array()
                }
              },
            }),
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
                transportType: Joi.string(),
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
              residencePermitRecto: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              residencePermitVerso: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null)
              },
              medicalCertificate: {
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
            isActive: Joi.boolean(),
            isConfirmed: Joi.boolean()
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
    server.route({
      method: 'GET',
      path: '/{_id}/tasks',
      options: {
        validate: {
          params: {
            _id: Joi.objectId(),
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: getUserTasks
    });
    // Delete user by id
    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId()
          },
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
          },
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
      path: '/{_id}/drivefolder',
      options: {
        validate: {
          params: {
            _id: Joi.objectId()
          },
          payload: Joi.object().keys({
            parentFolderId: Joi.string(),
            _id: Joi.objectId()
          })
        },
        auth: {
          strategy: 'jwt'
        }
      },
      handler: createDriveFolder
    });

    server.route({
      method: 'POST',
      path: '/{_id}/cloudinary/upload',
      handler: uploadImage,
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
      method: 'GET',
      path: '/{_id}/absences',
      options: {
        validate: {
          params: {
            _id: Joi.objectId()
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: getUserAbsences
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/absences/{absenceId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            absenceId: Joi.objectId().required()
          },
          payload: {
            startDate: Joi.date(),
            endDate: Joi.date(),
            reason: Joi.string()
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: updateUserAbsence
    });

    server.route({
      method: 'POST',
      path: '/{_id}/absences',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            startDate: Joi.date().required(),
            startDuration: Joi.string().required(),
            endDuration: Joi.string().allow('', null),
            endDate: Joi.date().required(),
            reason: Joi.string().required()
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: createUserAbsence
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/absences/{absenceId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            absenceId: Joi.objectId().required()
          },
        },
        auth: { strategy: 'jwt' }
      },
      handler: removeUserAbsence
    });
  }
};
