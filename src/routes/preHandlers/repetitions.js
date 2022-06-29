const Boom = require('@hapi/boom');
const get = require('lodash/get');
const UserCompany = require('../../models/UserCompany');
const { AUXILIARY } = require('../../helpers/constants');

exports.authorizeRepetitionGet = async (req) => {
  const { credentials } = req.auth;
  const companyId = get(credentials, 'company._id');
  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;

  if (isAuxiliary) throw Boom.forbidden();

  const user = await UserCompany.countDocuments(({ user: req.query.auxiliary, company: companyId }));
  if (!user) throw Boom.notFound();

  return null;
};
