const Boom = require('@hapi/boom');
const { get } = require('lodash');
const {
  COURSE,
  COACH,
  CLIENT_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  CLIENT_EXPORT_TYPES,
} = require('../../helpers/constants');

exports.authorizeExport = (req) => {
  const allowedClientRole = [COACH, CLIENT_ADMIN].includes(get(req, 'auth.credentials.role.client.name'));
  const allowedVendorRole = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN]
    .includes(get(req, 'auth.credentials.role.vendor.name'));
  const vendorExportTypes = [COURSE];

  if ((CLIENT_EXPORT_TYPES.includes(req.params.type) && !allowedClientRole) ||
  (vendorExportTypes.includes(req.params.type) && !allowedVendorRole)) {
    throw Boom.forbidden();
  }

  return null;
};
