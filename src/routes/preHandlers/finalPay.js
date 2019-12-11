const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');

exports.authorizeFinalPayCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const ids = req.payload.map(pay => pay.auxiliary);
  const usersCount = await User.countDocuments({ company: companyId, _id: { $in: ids } });
  if (usersCount !== ids.length) throw Boom.forbidden();
  return null;
};
