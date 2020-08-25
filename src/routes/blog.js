'use strict';

const Joi = require('joi');
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
          query: Joi.object({ feed_url: Joi.string().uri().required() }),
        },
        auth: false,
      },
      handler: getRssFeeds,
    });
  },
};
