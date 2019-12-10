const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');

exports.authorizePayDocumentCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const user = await User.findOne({ _id: req.payload.user, company: companyId }).lean();
  if (!user) throw Boom.forbidden();

  return null;
};
