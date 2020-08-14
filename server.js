'use strict';

require('dotenv').config();
const Hapi = require('@hapi/hapi');
const Boom = require('@hapi/boom');

const { mongooseConnection } = require('./src/config/mongoose');
const { routes } = require('./src/routes/index');
const { plugins } = require('./src/plugins/index');

const server = Hapi.server({
  port: process.env.NODE_ENV === 'test' ? 3001 : (process.env.PORT || 3000),
  routes: {
    log: {
      collect: true,
    },
    cors: {
      origin: ['*'],
      additionalHeaders: ['accept-language', 'accept-encoding', 'access-control-request-headers', 'x-access-token'],
    },
    validate: {
      async failAction(request, h, err) {
        request.log('validationError', err.message);
        if (process.env.NODE_ENV === 'production') {
          throw Boom.badRequest();
        }
        throw err;
      },
    },
  },
});

const init = async () => {
  await server.register([...plugins]);
  await server.register([...routes]);

  mongooseConnection(server);

  await server.start();
  server.log('info', `Server running at: ${server.info.uri}`);
};

module.exports = server;

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

init();

