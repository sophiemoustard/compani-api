const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Company = require('../../models/Company');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } = require('../../helpers/constants');

const { language } = translate;

exports.companyExists = async (req) => {
  try {
    const company = await Company.findOne({ _id: req.params._id }).lean();
    if (!company) throw Boom.notFound(translate[language].CompanyNotFound);

    return true;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

exports.authorizeCompanyUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  const vendorRole = get(req, 'auth.credentials.role.vendor.name') || null;
  const isVendorAdmin = !!vendorRole && [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(vendorRole);
  if (!isVendorAdmin && (!companyId || !UtilsHelper.areObjectIdsEquals(req.params._id, companyId))) {
    throw Boom.forbidden();
  }

  return null;
};
