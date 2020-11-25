'use-strict';

const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const { list, create } = require('../controllers/categoryController');
const { checkCategoryNameExists } = require('./preHandlers/categories');

exports.plugin = {
  name: 'routes-categories',
  register: async (server) => {
    server.route({
      method: 'GET',
      path: '/',
      options: {
        auth: { scope: ['programs:edit'] },
      },
      handler: list,
    });

    server.route({
      method: 'POST',
      path: '/',
      options: {
        validate: {
          payload: Joi.object({
            name: Joi.string().required(),
          }),
        },
        auth: { scope: ['programs:edit'] },
        pre: [{ method: checkCategoryNameExists }],
      },
      handler: create,
    });
  },
};
