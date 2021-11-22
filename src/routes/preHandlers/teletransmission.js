const Boom = require('@hapi/boom');
const get = require('lodash/get');
const ThirdPartyPayer = require('../../models/ThirdPartyPayer');
const UtilsHelper = require('../../helpers/utils');

exports.authorizeDelivery = async (req) => {
  const tppsQuery = UtilsHelper.formatObjectIdsArray(req.query.thirdPartyPayers);
  const tpps = await ThirdPartyPayer
    .find({ _id: { $in: tppsQuery }, company: get(req, 'auth.credentials.company._id') })
    .lean();
  if (tppsQuery.length !== tpps.length) return Boom.notFound();

  if (tpps.some(t => !t.teletransmissionId)) return Boom.forbidden();
  if (tpps.some(t => !t.teletransmissionType) || tpps.some(t => !t.companyCode)) return Boom.forbidden();

  if ([...new Set(tpps.map(t => t.teletransmissionType))].length !== 1) return Boom.conflict();
  if ([...new Set(tpps.map(t => t.companyCode))].length !== 1) return Boom.conflict();

  return null;
};
