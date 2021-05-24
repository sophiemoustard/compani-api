const Boom = require('@hapi/boom');
const get = require('lodash/get');
const User = require('../../models/User');
const Sector = require('../../models/Sector');
const UtilsHelper = require('../../helpers/utils');

exports.authorizePayCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const ids = req.payload.map(pay => pay.auxiliary);
  const usersCount = await User.countDocuments({ company: companyId, _id: { $in: ids } });
  if (usersCount !== ids.length) throw Boom.forbidden();

  return null;
};

exports.authorizeGetDetails = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (req.query.auxiliary) {
    const auxiliary = await User.countDocuments({ _id: req.query.auxiliary, company: companyId });
    if (!auxiliary) throw Boom.forbidden();
  }

  if (req.query.sector) {
    const sectors = UtilsHelper.formatIdsArray(req.query.sector);
    const sectorsCount = await Sector.countDocuments({ _id: { $in: sectors }, company: companyId });
    if (sectorsCount !== sectors.length) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeGetHoursToWork = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const sectors = UtilsHelper.formatIdsArray(req.query.sector);
  const sectorsCount = await Sector.countDocuments({ _id: { $in: sectors }, company: companyId });
  if (sectorsCount !== sectors.length) throw Boom.forbidden();

  return null;
};
