const Boom = require('boom');
const translate = require('../helpers/translate');
const { populateRoles } = require('../helpers/roles');
const Role = require('../models/Role');

const { language } = translate;

const list = async (req) => {
  try {
    let roles = await Role.find(req.query);
    if (roles.length === 0) {
      return {
        message: translate[language].rolesNotFound,
        data: { roles: [] },
      };
    }

    roles = populateRoles(roles);

    return {
      message: translate[language].rolesFound,
      data: { roles },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list };
