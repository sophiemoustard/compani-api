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
  updateTask,
  uploadFile,
  uploadImage,
  createDriveFolder,
  getUserContracts,
  updateUserContract,
  createUserContract,
  removeUserContract,
  createUserContractVersion,
  updateUserContractVersion,
  removeUserContractVersion
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
            }),
            administrative: Joi.object().keys({
              signup: Joi.object().keys({
                firstSmsDate: Joi.string()
              }),
              identity: Joi.object().keys({
                title: Joi.string(),
                nationality: Joi.string(),
                birthDate: Joi.date(),
                birthContry: Joi.string(),
                birthState: Joi.string(),
                birthCity: Joi.string(),
                socialSecurityNumber: Joi.number()
              }),
              contact: Joi.object().keys({
                addressId: Joi.string(),
                address: Joi.string(),
                additionalAddress: Joi.string(),
                zipCode: Joi.string(),
                city: Joi.string()
              }),
              emergencyContact: Joi.object().keys({
                name: Joi.string(),
                phoneNumber: Joi.string()
              }),
              transportInvoice: Joi.object().keys({
                transportType: Joi.string()
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
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null)
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
                birthDate: Joi.date(),
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
          // scope: process.env.NODE_ENV ? ['right2:write'] : ['Admin', 'Tech', 'Coach', 'Auxiliaire']
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
          // scope: process.env.NODE_ENV ? ['right2:write'] : ['Admin', 'Tech', 'Coach', 'Auxiliaire']
        }
      }
    });

    server.route({
      method: 'GET',
      path: '/{_id}/contracts',
      options: {
        validate: {
          params: {
            _id: Joi.objectId()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: getUserContracts
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/contracts/{contractId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            contractId: Joi.objectId().required()
          },
          payload: {
            creationDate: Joi.date(),
            startDate: Joi.date(),
            endDate: Joi.date(),
            contractType: Joi.string(),
            customer: {
              firstname: Joi.string(),
              lastname: Joi.string(),
              customer_id: Joi.string()
            },
            status: Joi.string()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: updateUserContract
    });

    server.route({
      method: 'POST',
      path: '/{_id}/contracts',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
          },
          payload: Joi.object().keys({
            startDate: Joi.date().required(),
            customer: {
              firstname: Joi.string(),
              lastname: Joi.string(),
              customer_id: Joi.string()
            },
            status: Joi.string().required(),
            grossHourlyRate: Joi.string().required(),
            weeklyHours: Joi.string().required(),
            ogustContractId: Joi.string().required()
          })
        },
        auth: { strategy: 'jwt' }
      },
      handler: createUserContract
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/contracts/{contractId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            contractId: Joi.objectId().required()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: removeUserContract
    });

    server.route({
      method: 'POST',
      path: '/{_id}/contracts/{contractId}/versions',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            contractId: Joi.objectId().required()
          },
          payload: {
            creationDate: Joi.date(),
            startDate: Joi.date().required(),
            endDate: Joi.date(),
            weeklyHours: Joi.number().required(),
            salary: Joi.number(),
            grossHourlyRate: Joi.number()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: createUserContractVersion
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/contracts/{contractId}/versions/{versionId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            contractId: Joi.objectId().required(),
            versionId: Joi.objectId().required()
          },
          payload: {
            isActive: Joi.boolean(),
            weeklyHours: Joi.number()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: updateUserContractVersion
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/contracts/{contractId}/versions/{versionId}',
      options: {
        validate: {
          params: {
            _id: Joi.objectId().required(),
            contractId: Joi.objectId().required(),
            versionId: Joi.objectId().required()
          }
        },
        auth: { strategy: 'jwt' }
      },
      handler: removeUserContractVersion
    });
  }
};
