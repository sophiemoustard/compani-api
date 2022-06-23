const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { AUXILIARY } = require('../../helpers/constants');
const User = require('../../models/User');

exports.authorizeRepetitionGet = async (req) => {
  const { credentials } = req.auth;
  const companyId = get(credentials, 'company._id');
  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;

  if (isAuxiliary) throw Boom.forbidden();

  const auxiliary = await User.countDocuments({ _id: req.query.auxiliary, company: companyId });
  if (!auxiliary) throw Boom.notFound();

  return null;
};
