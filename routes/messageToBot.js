'use strict';

const Joi = require('joi');
const Boom = require('boom');
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
            content: Joi.string().required(),
            sectors: Joi.alternatives().try(Joi.string(), Joi.array()).required(),
            senderId: Joi.objectId().required(),
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
          // scope: ['Admin', 'Tech', 'Coach']
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
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
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
            success: Joi.boolean().default(false),
            recipientId: Joi.objectId().required(),
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right2:write'] : ['Admin', 'Tech', 'Coach']
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
          }),
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right1:read'] : ['Admin', 'Tech', 'Coach']
        }
      },
      handler: list
    });

    server.route({
      method: 'GET',
      path: '/{_id}',
      options: {
        validate: {
          params: { _id: Joi.objectId().required() },
          failAction: async (request, h, err) => {
            if (process.env.NODE_ENV === 'production') {
              console.error('ValidationError:', err.message);
              throw Boom.badRequest('Invalid request payload input');
            } else {
              console.error(err);
              throw err;
            }
          },
        },
        auth: {
          strategy: 'jwt',
          // scope: process.env.NODE_ENV === 'test' ? ['right1:read'] : ['Admin', 'Tech', 'Coach']
        }
      },
      handler: getById
    });
  }
};
