const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Company = require('../../models/Company');
const Holding = require('../../models/Holding');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');
const { TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN, CLIENT_ADMIN, HOLDING_ADMIN } = require('../../helpers/constants');
const User = require('../../models/User');

const { language } = translate;

exports.doesCompanyExist = async (req) => {
  try {
    const company = await Company.countDocuments({ _id: req.params._id });
    if (!company) throw Boom.notFound(translate[language].CompanyNotFound);

    return true;
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const salesRepresentativeExists = async (userId) => {
  const salesRepresentative = await User.findOne({ _id: userId }, { role: 1 }).lean({ autopopulate: true });
  const rofOrAdminRoles = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN];
  if (!salesRepresentative || !(rofOrAdminRoles.includes(get(salesRepresentative, 'role.vendor.name')))) {
    throw Boom.notFound();
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

  if (payload.salesRepresentative) await salesRepresentativeExists(payload.salesRepresentative);

  return null;
};

exports.authorizeCompanyCreation = async (req) => {
  const { name, salesRepresentative } = req.payload;
  const nameAlreadyExists = await Company
    .countDocuments({ name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].companyExists);

  if (salesRepresentative) await salesRepresentativeExists(salesRepresentative);

  return null;
};

exports.authorizeGetCompanies = async (req) => {
  const { holding } = req.query;

  if (holding) {
    const holdingExist = await Holding.countDocuments({ _id: holding });
    if (!holdingExist) throw Boom.notFound();

    const vendorRole = get(req, 'auth.credentials.role.vendor.name');

    if ([TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(vendorRole)) return null;

    const holdingRole = get(req, 'auth.credentials.role.holding.name');
    const userHolding = get(req, 'auth.credentials.holding._id');
    if (!(holdingRole === HOLDING_ADMIN && UtilsHelper.areObjectIdsEquals(holding, userHolding))) {
      throw Boom.forbidden();
    }
  }

  return null;
};
