const Boom = require('@hapi/boom');
const usersSeed = require('../../seeds/users');

const seedDb = async (req) => {
  try {
    if (process.env.NODE_ENV !== 'test') throw Boom.forbidden();

    await usersSeed.seedDb();

    return { message: 'Test database populated !' };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { seedDb };
