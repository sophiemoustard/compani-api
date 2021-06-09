const Boom = require('@hapi/boom');
const get = require('lodash/get');
const UtilsHelper = require('../../helpers/utils');
const UserCompany = require('../../models/UserCompany');
const Sector = require('../../models/Sector');

exports.authorizeEventsHistoriesGet = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (!req.query.auxiliaries && !req.query.sectors) return null;

  if (req.query.auxiliaries) {
    const auxiliariesIds = UtilsHelper.formatIdsArray(req.query.auxiliaries);
    const auxiliariesCount = await UserCompany.countDocuments({ user: { $in: auxiliariesIds }, company: companyId });
    if (auxiliariesCount !== auxiliariesIds.length) throw Boom.forbidden();
  }

  if (req.query.sectors) {
    const sectorsIds = UtilsHelper.formatIdsArray(req.query.sectors);
    const sectorCount = await Sector.countDocuments({ _id: { $in: sectorsIds }, company: companyId });
    if (sectorCount !== sectorsIds.length) throw Boom.forbidden();
  }

  return null;
};
