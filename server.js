'use strict';

require('dotenv').config();
const Hapi = require('hapi');

const { routes } = require('./routes/index');
const { plugins } = require('./plugins/index');

const server = Hapi.server({
  port: process.env.NODE_ENV === 'test' ? 3002 : 3003,
  host: 'localhost'
});


const validate = async (decoded) => {
  const credentials = {
    _id: decoded._id,
    scope: [decoded.role, `user-${decoded._id}`]
  };
  return { isValid: true, credentials };
};

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
  require('./config/mongoose');
  console.log(`Server running at: ${server.info.uri}`);
};

module.exports = server;

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();

