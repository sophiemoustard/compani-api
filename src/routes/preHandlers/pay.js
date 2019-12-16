const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');
const Sector = require('../../models/Sector');

exports.authorizePayCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const ids = req.payload.map(pay => pay.auxiliary);
  const usersCount = await User.countDocuments({ company: companyId, _id: { $in: ids } });
  if (usersCount !== ids.length) throw Boom.forbidden();
  return null;
};

exports.authorizeGetDetails = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const auxiliary = await User.findOne({ _id: req.query.auxiliary, company: companyId }).lean();
  if (!auxiliary) throw Boom.forbidden();
  return null;
};

exports.authorizeGetHoursToWork = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const sector = await Sector.findOne({ _id: req.query.sector, company: companyId }).lean();
  if (!sector) throw Boom.forbidden();
  return null;
};
