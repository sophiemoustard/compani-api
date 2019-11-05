const Boom = require('boom');

exports.authorizeCompanyUpdate = async (req) => {
  if (!req.auth.credentials.company || !req.auth.credentials.company._id) throw Boom.forbidden();
  const companyId = req.auth.credentials.company._id;

  if (req.params._id === companyId.toHexString()) return null;

  throw Boom.forbidden();
};
