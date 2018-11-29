'use strict';

const Joi = require('joi');

const {
  showAll,
  getById,
  update,
  create
} = require('../../controllers/Ogust/sepaInfoController');

exports.plugin = {
  name: 'routes-ogust-sepainfo',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          query: {
            id_tiers: Joi.string(),
            nbperpage: Joi.number().default(150),
            pagenum: Joi.number().default(1)
          }
        },
        auth: false
      },
      handler: showAll
    });
    server.route({
      method: 'GET',
      path: '/{id}',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          params: { id: Joi.string() }
        },
        auth: false
      },
      handler: getById
    });
    server.route({
      method: 'PUT',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            id_tiers: [Joi.string(), Joi.number()],
            signature_date: Joi.string(),
          })
        },
        auth: false
      },
      handler: update
    });
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          headers: Joi.object().keys({
            'x-ogust-token': Joi.string().required()
          }).options({ allowUnknown: true }),
          payload: Joi.object().keys({
            id_tiers: [Joi.string().required(), Joi.number().required()],
            society: Joi.string().default('06540101'),
            ics: Joi.string().default('FR33ZZZ80B7BA'),
          })
        },
        auth: false
      },
      handler: create
    });
  },
};

