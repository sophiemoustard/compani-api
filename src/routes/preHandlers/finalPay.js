const Boom = require('@hapi/boom');
const get = require('lodash/get');
const UserCompany = require('../../models/UserCompany');

exports.authorizeFinalPayCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const ids = req.payload.map(pay => pay.auxiliary);
  const usersCount = await UserCompany.countDocuments({ user: { $in: ids }, company: companyId });
  if (usersCount !== ids.length) throw Boom.notFound();
  return null;
};
