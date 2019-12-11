const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');

exports.authorizePayCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  for (const pay of req.payload) {
    const user = await User.findOne({ _id: pay.auxiliary, company: companyId }).lean();
    if (!user) throw Boom.forbidden();
  }
  return null;
};
