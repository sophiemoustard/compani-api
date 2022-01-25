const Boom = require('@hapi/boom');
const { get } = require('lodash');
const {
  COACH,
  CLIENT_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  CLIENT_EXPORT_TYPES,
  VENDOR_EXPORT_TYPES,
} = require('../../helpers/constants');

exports.authorizeExport = (req) => {
  const allowedClientRole = [COACH, CLIENT_ADMIN].includes(get(req, 'auth.credentials.role.client.name'));
  const allowedVendorRole = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN]
    .includes(get(req, 'auth.credentials.role.vendor.name'));

  if ((CLIENT_EXPORT_TYPES.includes(req.params.type) && !allowedClientRole) ||
  (VENDOR_EXPORT_TYPES.includes(req.params.type) && !allowedVendorRole)) {
    throw Boom.forbidden();
  }

  return null;
};
