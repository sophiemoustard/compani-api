const Boom = require('boom');
const translate = require('../helpers/translate');
const RoleHelper = require('../helpers/roles');

const { language } = translate;

const list = async (req) => {
  try {
    const roles = await RoleHelper.list(req.query);

    return {
      message: roles.length === 0 ? translate[language].rolesNotFound : translate[language].rolesFound,
      data: { roles },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list };
