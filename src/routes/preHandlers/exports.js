const Boom = require('@hapi/boom');
const { get } = require('lodash');
const {
  WORKING_EVENT,
  BILL,
  PAYMENT,
  ABSENCE,
  PAY,
  CONTRACT,
  COURSE,
  COACH,
  CLIENT_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  SERVICE,
  AUXILIARY,
  HELPER,
  CUSTOMER,
  FUNDING,
  SUBSCRIPTION,
  SECTOR,
  RUP,
  REFERENT,
} = require('../../helpers/constants');

exports.authorizeExport = (req) => {
  const allowedClientRole = [COACH, CLIENT_ADMIN].includes(get(req, 'auth.credentials.role.client.name'));
  const allowedVendorRole = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN]
    .includes(get(req, 'auth.credentials.role.vendor.name'));
  const clientExportTypes = [
    WORKING_EVENT,
    BILL,
    PAYMENT,
    ABSENCE,
    PAY,
    CONTRACT,
    SERVICE,
    AUXILIARY,
    HELPER,
    CUSTOMER,
    FUNDING,
    SUBSCRIPTION,
    SECTOR,
    RUP,
    REFERENT,
  ];
  const vendorExportTypes = [COURSE];

  if ((clientExportTypes.includes(req.params.type) && !allowedClientRole) ||
  (vendorExportTypes.includes(req.params.type) && !allowedVendorRole)) {
    throw Boom.forbidden();
  }

  return null;
};
