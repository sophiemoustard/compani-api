const Boom = require('@hapi/boom');
const get = require('lodash/get');
const UserCompany = require('../../models/UserCompany');
const Repetition = require('../../models/Repetition');
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

exports.authorizeRepetitionDeletion = async (req) => {
  const { credentials } = req.auth;
  const companyId = get(credentials, 'company._id');
  const isAuxiliary = get(credentials, 'role.client.name') === AUXILIARY;

  if (isAuxiliary) throw Boom.forbidden();

  const repetition = await Repetition.countDocuments(({ _id: req.params._id, company: companyId }));
  if (!repetition) throw Boom.notFound();

  return null;
};
