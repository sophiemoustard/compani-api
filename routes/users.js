'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  authenticate,
  create,
  list,
  activeList,
  activeListForCustomer,
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
} = require('../controllers/userController');


const driveUploadKeys = [
  'idCardRecto',
  'idCardVerso',
  'passport',
  'residencePermitRecto',
  'residencePermitVerso',
  'healthAttest',
  'certificates',
  'phoneInvoice',
  'navigoInvoice',
  'transportInvoice',
  'mutualFund',
  'vitalCard',
  'medicalCertificate',
];

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
            password: Joi.string().required(),
          }).required(),
        },
        auth: false,
      },
      handler: authenticate,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: { scope: ['users:edit'] },
        validate: {
          payload: Joi.object().keys({
            mobilePhone: Joi.string(),
            sector: Joi.objectId(),
            local: {
              email: Joi.string().email().required(),
              password: Joi.string().required(),
            },
            role: Joi.objectId().required(),
            picture: Joi.object().keys({
              link: Joi.string(),
            }),
            identity: Joi.object().keys({
              firstname: Joi.string(),
              lastname: Joi.string(),
              title: Joi.string(),
            }),
            contact: Joi.object().keys({
              address: {
                street: Joi.string().required(),
                additionalAddress: Joi.string().allow('', null),
                zipCode: Joi.string().required(),
                city: Joi.string().required(),
                fullAddress: Joi.string().required(),
                location: {
                  type: Joi.string(),
                  coordinates: Joi.array(),
                },
              },
            }),
            administrative: Joi.object().keys({
              transportInvoice: Joi.object().keys({
                transportType: Joi.string(),
              }),
            }),
            customers: Joi.array(),
            company: Joi.objectId().required(),
          }).required(),
        },
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['users:list'] },
        validate: {
          query: {
            role: [Joi.array(), Joi.string()],
            email: Joi.string().email(),
            sector: Joi.objectId(),
            customers: Joi.objectId(),
          },
        },
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/active',
      options: {
        auth: { scope: ['users:list'] },
        validate: {
          query: {
            role: [Joi.array(), Joi.string()],
            email: Joi.string().email(),
            sector: Joi.objectId(),
            customers: Joi.objectId(),
          },
        },
      },
      handler: activeList,
    });

    server.route({
      method: 'GET',
      path: '/activeForCustomer',
      options: {
        auth: { scope: ['users:list'] },
        validate: {
          query: {
            customer: Joi.objectId().required(),
          },
        },
      },
      handler: activeListForCustomer,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        auth: { scope: ['users:edit', 'user-{params._id}'] },
      },
      handler: show,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['users:edit', 'user-{params._id}'] },
        validate: {
          payload: Joi.object().keys({
            _id: Joi.objectId(),
            mobilePhone: Joi.string(),
            emergencyPhone: Joi.string(),
            sector: Joi.objectId(),
            'local.email': Joi.string().email(), // bot special case
            local: {
              email: Joi.string().email(),
              password: Joi.string(),
            },
            role: Joi.objectId(),
            picture: Joi.object().keys({
              link: Joi.string().allow(null),
              publicId: Joi.string().allow(null),
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
              socialSecurityNumber: Joi.number(),
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
                  coordinates: Joi.array(),
                },
              },
            }),
            administrative: {
              signup: {
                step: Joi.string(),
                complete: Joi.boolean(),
              },
              identityDocs: Joi.string().valid('pp', 'cni', 'ts'),
              mutualFund: {
                has: Joi.boolean(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              navigoInvoice: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              transportInvoice: {
                transportType: Joi.string(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              phoneInvoice: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              healthAttest: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              idCardRecto: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              idCardVerso: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              passport: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              residencePermitRecto: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              residencePermitVerso: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              medicalCertificate: {
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              },
              socialSecurityNumber: Joi.number(),
              payment: {
                rib: {
                  iban: Joi.string(),
                  bic: Joi.string(),
                },
              },
              emergencyContact: Joi.object().keys({
                name: Joi.string(),
                phoneNumber: Joi.string(),
              }),
            },
            procedure: Joi.object().keys({
              _id: Joi.objectId(),
              name: Joi.string(),
              isDone: Joi.boolean(),
            }),
            isActive: Joi.boolean(),
            isConfirmed: Joi.boolean(),
          }).required(),
        },
      },
      handler: update,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/certificates',
      options: {
        auth: { scope: ['users:edit', 'user-{params._id}'] },
        validate: {
          params: {
            _id: Joi.objectId(),
          },
          payload: Joi.object().keys({
            _id: Joi.objectId(),
            'administrative.certificates': {
              driveId: Joi.string(),
            },
          }),
        },
      },
      handler: updateCertificates,
    });

    server.route({
      method: 'PUT',
      path: '/{user_id}/tasks/{task_id}',
      options: {
        auth: { scope: ['users:edit'] },
        validate: {
          params: {
            user_id: Joi.objectId(),
            task_id: Joi.objectId(),
          },
          payload: Joi.object().keys({
            isDone: Joi.boolean(),
            user_id: Joi.objectId(),
            task_id: Joi.objectId(),
          }),
        },
      },
      handler: updateTask,
    });

    server.route({
      method: 'GET',
      path: '/{_id}/tasks',
      options: {
        auth: { scope: ['users:edit'] },
        validate: {
          params: {
            _id: Joi.objectId(),
          },
        },
      },
      handler: getUserTasks,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['users:edit'] },
        validate: {
          params: {
            _id: Joi.objectId(),
          },
        },
      },
      handler: remove,
    });

    server.route({
      method: 'GET',
      path: '/presentation',
      options: {
        validate: {
          query: Joi.object().keys({
            role: [Joi.string(), Joi.array()],
            location: [Joi.string(), Joi.array()],
          }),
        },
        auth: false,
      },
      handler: getPresentation,
    });

    server.route({
      method: 'POST',
      path: '/refreshToken',
      options: {
        validate: {
          payload: {
            refreshToken: Joi.string().required(),
          },
        },
        auth: false,
      },
      handler: refreshToken,
    });

    server.route({
      method: 'POST',
      path: '/forgotPassword',
      options: {
        validate: {
          payload: Joi.object().keys({
            email: Joi.string().email().required(),
            from: Joi.string().valid('p', 'w').default('w').required(),
          }),
        },
        auth: false,
      },
      handler: forgotPassword,
    });

    server.route({
      method: 'GET',
      path: '/checkResetPassword/{token}',
      options: {
        validate: {
          params: Joi.object().keys({
            token: Joi.string().required(),
          }),
        },
        auth: false,
      },
      handler: checkResetPasswordToken,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        auth: { scope: ['users:edit', 'user-{params._id}'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
        validate: {
          payload: Joi.object({
            ...driveUploadKeys.reduce((obj, key) => Object.assign(obj, { [key]: Joi.any() }), {}),
            date: Joi.date(),
            fileName: Joi.string().required(),
            'Content-Type': Joi.string().required(),
          })
            .or([driveUploadKeys]),
          params: {
            _id: Joi.objectId().required(),
            driveId: Joi.string().required(),
          },
        },
      },
    });

    server.route({
      method: 'POST',
      path: '/{_id}/drivefolder',
      options: {
        auth: { scope: ['users:edit', 'user-{params._id}'] },
        validate: {
          params: {
            _id: Joi.objectId(),
          },
          payload: Joi.object().keys({
            parentFolderId: Joi.string(),
            _id: Joi.objectId(),
          }),
        },
      },
      handler: createDriveFolder,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/cloudinary/upload',
      handler: uploadImage,
      options: {
        auth: { scope: ['users:edit', 'user-{params._id}'] },
        payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data',
          maxBytes: 5242880,
        },
      },
    });
  },
};
