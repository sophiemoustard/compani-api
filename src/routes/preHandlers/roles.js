const Boom = require('@hapi/boom');
const Role = require('../../models/Role');

exports.authorizeGetRole = async (req) => {
  if (req.query.name) {
    const rolesCount = await Role.countDocuments({ name: req.query.name });
    if (!rolesCount) throw Boom.notFound();
  }

  return null;
};
