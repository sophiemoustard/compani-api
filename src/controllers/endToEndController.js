const Boom = require('@hapi/boom');
const endToEndHelper = require('../helpers/endToEnd');

const seedDb = async (req) => {
  try {
    await endToEndHelper.seedDb(req.params.type);

    return { message: 'Test database populated !' };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { seedDb };
