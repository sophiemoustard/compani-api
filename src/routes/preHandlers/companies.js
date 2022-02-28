const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Company = require('../../models/Company');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN } = require('../../helpers/constants');

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
  const companyId = get(req, 'auth.credentials.company._id', null);
  const vendorRole = get(req, 'auth.credentials.role.vendor.name') || null;
  const isVendorAdmin = !!vendorRole && [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(vendorRole);
  if (!isVendorAdmin && (!companyId || !UtilsHelper.areObjectIdsEquals(req.params._id, companyId))) {
    throw Boom.forbidden();
  }

  const nameAlreadyExistsOnOther = await Company
    .countDocuments({ _id: { $ne: req.params._id }, name: req.payload.name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExistsOnOther) throw Boom.conflict(translate[language].companyNameExistsOnOther);

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
