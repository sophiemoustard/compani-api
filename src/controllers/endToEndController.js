const Boom = require('@hapi/boom');
const authenticationSeed = require('../../tests/end2end/seed/authenticationSeed');

const seedDb = async (req) => {
  try {
    await authenticationSeed.seedDb();

    return { message: 'Test database populated !' };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { seedDb };
