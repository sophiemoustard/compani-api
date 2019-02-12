'use strict';

const Joi = require('joi');
const Boom = require('boom');
Joi.objectId = require('joi-objectid')(Joi);

const { getRssFeeds } = require('../controllers/blogController');

exports.plugin = {
  name: 'routes-blog',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/rssFeeds',
      options: {
        validate: {
          query: { feed_url: Joi.string().uri().required() },
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
        auth: false
      },
      handler: getRssFeeds
    });
  }
};
