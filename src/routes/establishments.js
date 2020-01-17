'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const { create } = require('../controllers/establishmentController');
const { workHealthServices } = require('../data/workHealthServices');
const { urssafCodes } = require('../data/urssafCodes');

exports.plugin = {
  name: 'routes-establishments',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      handler: create,
      options: {
        auth: { scope: ['establishments:edit'] },
        validate: {
          payload: Joi.object().keys({
            name: Joi.string().regex(/^[a-zA-Z0-9éèêëâàäöôûüîïç°2!#$%&'()*+,\-./:;<=>?@]{1,32}$/).required(),
            siret: Joi.string().regex(/^\d{14}$/).required(),
            phone: Joi.string().regex(/^[0]{1}[1-9]{1}[0-9]{8}$/).required(),
            workHealthService: Joi.string().valid(workHealthServices).required(),
            urssafCode: Joi.string().valid(urssafCodes).required(),
            address: Joi.object().keys({
              street: Joi.string().required(),
              fullAddress: Joi.string().required(),
              zipCode: Joi.string().required(),
              city: Joi.string().required(),
              location: Joi.object().keys({
                type: Joi.string().required(),
                coordinates: Joi.array().length(2).required(),
              }).required(),
            }),
          }),
        },
      },
    });
  },
};
