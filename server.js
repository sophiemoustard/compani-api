'use strict';

require('dotenv').config();
const Hapi = require('hapi');
const Boom = require('boom');

const { mongooseConnection } = require('./config/mongoose');
const { validate } = require('./helpers/authentification');
const { routes } = require('./routes/index');
const { plugins } = require('./plugins/index');

const server = Hapi.server({
  port: process.env.PORT || 3000,
  routes: {
    log: {
      collect: true
    },
    cors: {
      origin: ['*'],
      additionalHeaders: ['accept-language', 'accept-encoding', 'access-control-request-headers', 'x-access-token', 'x-ogust-token']
    },
    validate: {
      async failAction(request, h, err) {
        request.log('validationError', err.message);
        if (process.env.NODE_ENV === 'production') {
          throw Boom.badRequest('Invalid request payload input');
        }
        throw err;
      }
    }
  }
});

const init = async () => {
  await server.register([...plugins]);

  server.auth.strategy('jwt', 'jwt', {
    key: process.env.TOKEN_SECRET,
    headerKey: 'x-access-token',
    verifyOptions: { algorithms: ['HS256'] },
    validate
  });
  server.auth.default('jwt');

  await server.register([...routes]);

  await server.start();
  mongooseConnection(server);
  server.log('info', `Server running at: ${server.info.uri}`);
};

module.exports = server;

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();

