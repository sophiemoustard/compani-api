const Boom = require('boom');
const get = require('lodash/get');
const User = require('../../models/User');
const Sector = require('../../models/Sector');

exports.authorizeEventsHistoriesGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (!req.query.auxiliaries && !req.query.sectors) return null;

  if (req.query.auxiliaries) {
    const auxiliariesIds = Array.isArray(req.query.auxiliaries) ? req.query.auxiliaries : [req.query.auxiliaries];
    const auxiliariesCount = await User.countDocuments({ _id: { $in: auxiliariesIds }, company: companyId });
    if (auxiliariesCount !== auxiliariesIds.length) throw Boom.forbidden();
  }
  if (req.query.sectors) {
    const sectorsIds = Array.isArray(req.query.sectors) ? req.query.sectors : [req.query.sectors];
    const sectorCount = await Sector.countDocuments({ _id: { $in: sectorsIds }, company: companyId });
    if (sectorCount !== sectorsIds.length) throw Boom.forbidden();
  }

  return null;
};
