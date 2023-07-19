const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Company = require('../../models/Company');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN, CLIENT_ADMIN } = require('../../helpers/constants');
const User = require('../../models/User');

const { language } = translate;

exports.companyExists = async (req) => {
  try {
    const company = await Company.countDocuments({ _id: req.params._id });
    if (!company) throw Boom.notFound(translate[language].CompanyNotFound);

    return true;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCompanyUpdate = async (req) => {
  const { params, payload } = req;
  const updatedCompanyId = params._id;
  const loggedCompanyId = get(req, 'auth.credentials.company._id');
  const vendorRole = get(req, 'auth.credentials.role.vendor.name');

  const isVendorAdmin = !!vendorRole && [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(vendorRole);
  if (!isVendorAdmin && (!UtilsHelper.areObjectIdsEquals(updatedCompanyId, loggedCompanyId))) {
    throw Boom.forbidden();
  }

  const nameAlreadyExists = await Company
    .countDocuments({ _id: { $ne: updatedCompanyId }, name: payload.name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].companyExists);

  if (payload.billingRepresentative) {
    const billingRepresentative = await User
      .findOne({ _id: payload.billingRepresentative }, { role: 1 })
      .populate({ path: 'company' })
      .lean({ autopopulate: true });

    const billingRepresentativeExistsAndIsClientAdmin = billingRepresentative &&
      UtilsHelper.areObjectIdsEquals(billingRepresentative.company, updatedCompanyId) &&
      get(billingRepresentative, 'role.client.name') === CLIENT_ADMIN;
    if (!billingRepresentativeExistsAndIsClientAdmin) throw Boom.notFound();
  }

  return null;
};

exports.authorizeCompanyCreation = async (req) => {
  const { name } = req.payload;
  const nameAlreadyExists = await Company
    .countDocuments({ name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].companyExists);

  return null;
};
