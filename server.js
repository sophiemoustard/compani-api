'use strict';

require('dotenv').config();
const Hapi = require('hapi');

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
    }
  }
});

const init = async () => {
  await server.register([...plugins]);
  const io = require('socket.io')(server.listener);

  io.on('connection', (socket) => {
    console.log('connected');
    socket.on('SEND_MESSAGE', (data) => {
      console.log(`client saying ${data.user}`);
      socket.emit('MESSAGE', data);
    });
    io.emit('MESSAGE', 'test');
  });
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

