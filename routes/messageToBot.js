'use strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const {
  list,
  storeMessage,
  getById,
  sendMessageById,
  addMessageRecipientById
} = require('../controllers/messageToBotController');

exports.plugin = {
  name: 'routes-message-to-bot',
  register: async (server) => {
    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object().keys({
            message: Joi.string().required(),
            sectors: Joi.string().required(),
            senderId: Joi.objectId().required(),
          })
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach']
        }
      },
      handler: storeMessage
    });

    server.route({
      method: 'POST',
      path: '/send',
      options: {
        validate: {
          payload: Joi.object().keys({
            message: Joi.string().required(),
            recipientId: Joi.objectId().required(),
          })
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach']
        }
      },
      handler: sendMessageById
    });

    server.route({
      method: 'PUT',
      path: '/{_id}/recipient',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() },
          payload: Joi.object().keys({
            success: Joi.boolean().required(),
            recipientId: Joi.objectId().required(),
          })
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach']
        }
      },
      handler: addMessageRecipientById
    });

    server.route({
      method: 'GET',
      path: '/',
      options: {
        validate: {
          query: Joi.object().keys({
            senderId: Joi.objectId()
          })
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach']
        }
      },
      handler: list
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() }
        },
        auth: {
          strategy: 'jwt',
          scope: ['Admin', 'Tech', 'Coach']
        }
      },
      handler: getById
    });
  }
};
