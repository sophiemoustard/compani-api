'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  create,
  list,
  listWithSectorHistories,
  activeList,
  learnerList,
  show,
  exists,
  update,
  removeUser,
  updateCertificates,
  uploadFile,
  uploadPicture,
  deletePicture,
  createDriveFolder,
  addExpoToken,
  removeExpoToken,
} = require('../controllers/userController');
const { COURSE, DIRECTORY, ORIGIN_OPTIONS } = require('../helpers/constants');
const { USER_ROLE_LIST } = require('../models/User');
const { CIVILITY_OPTIONS } = require('../models/schemaDefinitions/identity');
const {
  getUser,
  authorizeUserUpdate,
  authorizeUserGetById,
  authorizeUsersGet,
  authorizeUserCreation,
  authorizeUserDeletion,
  authorizeLearnersGet,
  getPicturePublicId,
  authorizeExpoTokenEdit,
  checkExpoToken,
  authorizeUploadEdition,
  authorizeDriveFolderCreation,
} = require('./preHandlers/users');
const {
  addressValidation,
  phoneNumberValidation,
  expoTokenValidation,
  objectIdOrArray,
} = require('./validations/utils');
const { formDataPayload, dateToISOString } = require('./validations/utils');

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
      path: '/',
      options: {
        auth: { mode: 'optional' },
        validate: {
          payload: Joi.object().keys({
            origin: Joi.string().valid(...ORIGIN_OPTIONS).required(),
            company: Joi.objectId(),
            userCompanyStartDate: Joi.when(
              'company',
              { is: Joi.exist(), then: Joi.date(), otherwise: Joi.forbidden() }
            ),
            sector: Joi.objectId(),
            local: Joi.object().keys({
              email: Joi.string().email().required(),
              password: Joi.string().min(6),
            }).required(),
            role: Joi.objectId(),
            identity: Joi.object().keys({
              firstname: Joi.string().allow('', null),
              lastname: Joi.string().required(),
              title: Joi.string().valid(...CIVILITY_OPTIONS),
            }),
            contact: Joi.object().keys({
              phone: phoneNumberValidation.allow('', null),
              address: addressValidation,
            }),
            administrative: Joi.object().keys({
              transportInvoice: Joi.object().keys({
                transportType: Joi.string(),
              }),
            }),
            customer: Joi.objectId(),
          }).required(),
        },
        pre: [{ method: authorizeUserCreation }],
      },
      handler: create,
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['users:list'] },
        validate: {
          query: Joi.object({
            role: [Joi.array().items(Joi.string().valid(...USER_ROLE_LIST)), Joi.string().valid(...USER_ROLE_LIST)],
            company: Joi.objectId(),
            holding: Joi.objectId(),
            includeHoldingAdmins: Joi.when(
              'company',
              { is: Joi.exist(), then: Joi.boolean(), otherwise: Joi.forbidden() }
            ),
          }).oxor('company', 'holding'),
        },
        pre: [{ method: authorizeUsersGet }],
      },
      handler: list,
    });

    server.route({
      method: 'GET',
      path: '/sector-histories',
      options: {
        auth: { scope: ['users:list'] },
        validate: { query: Joi.object({ company: Joi.objectId() }) },
        pre: [{ method: authorizeUsersGet }],
      },
      handler: listWithSectorHistories,
    });

    server.route({
      method: 'GET',
      path: '/active',
      options: {
        auth: { scope: ['users:list'] },
        validate: {
          query: Joi.object({
            role: [Joi.array(), Joi.string()],
            email: Joi.string().email(),
            company: Joi.objectId(),
          }),
        },
        pre: [{ method: authorizeUsersGet }],
      },
      handler: activeList,
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['users:edit', 'user:read-{params._id}'] },
        pre: [{ method: authorizeUserGetById }],
      },
      handler: show,
    });

    server.route({
      method: 'GET',
      path: '/exists',
      options: {
        auth: { mode: 'optional' },
        validate: {
          query: Joi.object({ email: Joi.string().email().required() }),
        },
      },
      handler: exists,
    });

    server.route({
      method: 'GET',
      path: '/learners',
      options: {
        auth: { scope: ['users:list'] },
        validate: {
          query: Joi.object({
            action: Joi.string().required().valid(DIRECTORY, COURSE),
            companies: objectIdOrArray,
            startDate: dateToISOString,
            endDate: Joi.when(
              'startDate',
              {
                is: Joi.exist(),
                then: dateToISOString && Joi.date().min(Joi.ref('startDate')),
                otherwise: Joi.forbidden(),
              }
            ),
          }),
        },
        pre: [{ method: authorizeLearnersGet }],
      },
      handler: learnerList,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}',
      options: {
        auth: { scope: ['users:edit', 'user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({
            sector: Joi.objectId(),
            'local.email': Joi.string().email(), // bot special case
            local: Joi.object().keys({ email: Joi.string().email() }),
            role: Joi.objectId(),
            picture: Joi.object().keys({ link: Joi.string().allow(null), publicId: Joi.string().allow(null) }),
            mentor: Joi.string().allow('', null),
            identity: Joi.object().keys({
              title: Joi.string().valid(...CIVILITY_OPTIONS),
              firstname: Joi.string().allow('', null),
              lastname: Joi.string(),
              nationality: Joi.string(),
              birthDate: Joi.date(),
              birthCountry: Joi.string(),
              birthState: Joi.string(),
              birthCity: Joi.string(),
              socialSecurityNumber: Joi.number(),
            }),
            contact: Joi.object().keys({ phone: phoneNumberValidation.allow('', null), address: addressValidation }),
            administrative: Joi.object().keys({
              signup: Joi.object().keys({ step: Joi.string(), complete: Joi.boolean() }),
              identityDocs: Joi.string().valid('pp', 'cni', 'ts'),
              mutualFund: Joi.object().keys({
                has: Joi.boolean(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              }),
              navigoInvoice: Joi.object().keys({ driveId: Joi.string().allow(null), link: Joi.string().allow(null) }),
              transportInvoice: Joi.object().keys({
                transportType: Joi.string(),
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              }),
              phoneInvoice: Joi.object().keys({ driveId: Joi.string().allow(null), link: Joi.string().allow(null) }),
              healthAttest: Joi.object().keys({ driveId: Joi.string().allow(null), link: Joi.string().allow(null) }),
              idCardRecto: Joi.object().keys({ driveId: Joi.string().allow(null), link: Joi.string().allow(null) }),
              idCardVerso: Joi.object().keys({ driveId: Joi.string().allow(null), link: Joi.string().allow(null) }),
              passport: Joi.object().keys({ driveId: Joi.string().allow(null), link: Joi.string().allow(null) }),
              residencePermitRecto: Joi.object().keys({
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              }),
              residencePermitVerso: Joi.object().keys({
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              }),
              medicalCertificate: Joi.object().keys({
                driveId: Joi.string().allow(null),
                link: Joi.string().allow(null),
              }),
              socialSecurityNumber: Joi.number(),
              payment: Joi.object().keys({ rib: Joi.object().keys({ iban: Joi.string(), bic: Joi.string() }) }),
              emergencyContact: Joi.object().keys({ name: Joi.string(), phoneNumber: phoneNumberValidation }),
            }),
            isActive: Joi.boolean(),
            establishment: Joi.objectId(),
            biography: Joi.string().allow(''),
            customer: Joi.objectId(),
            holding: Joi.objectId(),
          }).required(),
        },
        pre: [{ method: authorizeUserUpdate }],
      },
      handler: update,
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/certificates',
      options: {
        auth: { scope: ['users:edit', 'user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object().keys({ certificates: Joi.object().keys({ driveId: Joi.string() }) }),
        },
        pre: [{ method: authorizeUserUpdate }],
      },
      handler: updateCertificates,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}',
      options: {
        auth: { scope: ['users:edit', 'user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [
          { method: getUser, assign: 'user' },
          { method: authorizeUserDeletion },
        ],
      },
      handler: removeUser,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/gdrive/{driveId}/upload',
      handler: uploadFile,
      options: {
        auth: { scope: ['users:edit', 'user:edit-{params._id}'] },
        payload: formDataPayload(),
        validate: {
          payload: Joi.object({
            date: Joi.date(),
            fileName: Joi.string().required(),
            type: Joi.string().required().valid(...driveUploadKeys),
            file: Joi.any().required(),
          }),
          params: Joi.object({ _id: Joi.objectId().required(), driveId: Joi.string().required() }),
        },
        pre: [{ method: authorizeUserUpdate }],
      },
    });

    server.route({
      method: 'POST',
      path: '/{_id}/drivefolder',
      options: {
        auth: { scope: ['users:edit'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        pre: [{ method: getUser }, { method: authorizeDriveFolderCreation }],
      },
      handler: createDriveFolder,
    });

    server.route({
      method: 'POST',
      path: '/{_id}/upload',
      handler: uploadPicture,
      options: {
        auth: { scope: ['users:edit', 'user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ fileName: Joi.string().required(), file: Joi.any().required() }),
        },
        payload: formDataPayload(),
        pre: [{ method: authorizeUploadEdition }],
      },
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/upload',
      handler: deletePicture,
      options: {
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
        },
        auth: { scope: ['users:edit', 'user:edit-{params._id}'] },
        pre: [{ method: getPicturePublicId, assign: 'publicId' }, { method: authorizeUploadEdition }],
      },
    });

    server.route({
      method: 'POST',
      path: '/{_id}/expo-token',
      options: {
        auth: { scope: ['user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required() }),
          payload: Joi.object({ formationExpoToken: expoTokenValidation.required() }),
        },
        pre: [{ method: authorizeExpoTokenEdit }, { method: checkExpoToken }],
      },
      handler: addExpoToken,
    });

    server.route({
      method: 'DELETE',
      path: '/{_id}/expo-token/{expoToken}',
      options: {
        auth: { scope: ['user:edit-{params._id}'] },
        validate: {
          params: Joi.object({ _id: Joi.objectId().required(), expoToken: Joi.string().required() }),
        },
        pre: [{ method: authorizeExpoTokenEdit }],
      },
      handler: removeExpoToken,
    });
  },
};
