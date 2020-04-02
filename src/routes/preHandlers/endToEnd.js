const Boom = require('@hapi/boom');

exports.authorizeDatabaseSeed = async () => {
  if (process.env.NODE_ENV !== 'test') throw Boom.forbidden();

  return null;
};
