const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Sector = require('../../models/Sector');
const UserCompany = require('../../models/UserCompany');
const UtilsHelper = require('../../helpers/utils');

exports.authorizePayCreation = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const ids = req.payload.map(pay => pay.auxiliary);
  const usersCount = await UserCompany.countDocuments({ company: companyId, user: { $in: ids } });
  if (usersCount !== ids.length) throw Boom.notFound();

  return null;
};

exports.authorizeGetDetails = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (req.query.auxiliary) {
    const auxiliaryCompany = await UserCompany.countDocuments({ user: req.query.auxiliary, company: companyId });
    if (!auxiliaryCompany) throw Boom.forbidden();
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
