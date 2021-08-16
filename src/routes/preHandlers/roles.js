const Boom = require('@hapi/boom');
const Role = require('../../models/Role');
const UtilsHelper = require('../../helpers/utils');

exports.authorizeGetRole = async (req) => {
  if (req.query.name) {
    const roleNames = UtilsHelper.formatIdsArray(req.query.name);
    const rolesCount = await Role.countDocuments({ name: { $in: roleNames } });
    if (!rolesCount) throw Boom.notFound();
  }

  return null;
};
